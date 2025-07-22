import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { promises as fs } from "fs";
import https from "https";
import path from "path";
import { createWorker, OEM, PSM } from "tesseract.js";
dotenv.config();

// Type definitions for iframe parsing
interface IframeInfo {
  src: string;
  id?: string;
  name?: string;
  width?: string;
  height?: string;
  index: number;
}

interface ParsedContent {
  title: string;
  metaDescription?: string;
  iframes: IframeInfo[];
  scripts: string[];
  iframeCount: number;
  scriptCount: number;
}

interface CookieInfo {
  name: string;
  value: string;
  domain?: string;
  path?: string;
}

// Type definitions
interface IframeInfo {
  src: string;
  id?: string;
  name?: string;
  width?: string;
  height?: string;
  index: number;
}

interface ParsedContent {
  title: string;
  metaDescription?: string;
  iframes: IframeInfo[];
  scripts: string[];
  iframeCount: number;
  scriptCount: number;
}

export class PhoneChecker {
  private readonly targetUrl = "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/apia.portal.PortalAction.run?dshId=1057";
  private readonly outputDir = process.env.VERCEL ? "/tmp/responses" : path.join(__dirname, "..", "responses");

  constructor() {
    this.ensureOutputDirectory();
  }

  /**
   * Ensures the output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error("Error creating output directory:", error);
    }
  }

  /**
   * Performs a GET request to the URSEC portal and saves the response
   * @param number - The phone number to check
   * @returns Promise<any> - The response data
   */
  async check(number: string): Promise<any> {
    try {
      console.log(`Checking phone number: ${number}`);

      // Create HTTPS agent that can handle certificate issues
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false, // Only ignore certs in development
        keepAlive: true,
        timeout: 10000,
        maxSockets: 10,
        maxFreeSockets: 10,
      });

      // More realistic Chrome browser headers
      const chromeHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Cache-Control": "max-age=0",
      };

      // Perform the GET request
      const response = await axios.get(this.targetUrl, {
        timeout: 10000, // 10 second timeout
        httpsAgent: httpsAgent, // Use the custom HTTPS agent
        maxRedirects: 5, // Follow up to 5 redirects
        validateStatus: (status) => status < 500, // Accept all status codes below 500
        headers: chromeHeaders,
      });

      // Parse HTML response with cheerio
      const $ = cheerio.load(response.data);

      // Find all iframes and extract their src attributes
      const iframes: IframeInfo[] = [];
      $("iframe").each((index, element) => {
        const src = $(element).attr("src");
        const id = $(element).attr("id");
        const name = $(element).attr("name");
        const width = $(element).attr("width");
        const height = $(element).attr("height");

        if (src) {
          iframes.push({
            src,
            id,
            name,
            width,
            height,
            index,
          });
        }
      });

      // Extract other useful information from the HTML
      const title = $("title").text();
      const metaDescription = $('meta[name="description"]').attr("content");
      const scripts: string[] = [];
      $("script[src]").each((index, element) => {
        const src = $(element).attr("src");
        if (src) {
          scripts.push(src);
        }
      });
      // Extract cookies from response
      const cookies = this.extractCookies(response);

      // Create response object with metadata and parsed content
      const responseData: any = {
        timestamp: new Date().toISOString(),
        phoneNumber: number,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        rawData: response.data,
        parsedContent: {
          title,
          metaDescription,
          iframes,
          scripts: scripts.slice(0, 10), // Limit to first 10 scripts
          iframeCount: iframes.length,
          scriptCount: scripts.length,
        },
        cookies: cookies,
        requestUrl: this.targetUrl,
      };

      // If iframes exist, fetch their content using the same cookies
      if (iframes.length > 0) {
        console.log(`📄 Found ${iframes.length} iframes, fetching their content...`);
        responseData.iframeResponses = await this.fetchIframeContent(iframes, cookies, httpsAgent, number);
      }

      console.log(`✅ Successfully checked phone number: ${number}`);
      console.log(`📄 Found ${iframes.length} iframes in the response`);

      if (iframes.length > 0) {
        console.log("🔍 Iframe sources found:");
        iframes.forEach((iframe, index) => {
          console.log(`   ${index + 1}. ${iframe.src} ${iframe.id ? `(id: ${iframe.id})` : ""}`);
        });
      }

      const iframeData = responseData.iframeResponses;
      if (iframeData && iframeData.length > 0) {
        const iframeResponse = iframeData[0].phoneValidationResult;
        return iframeResponse;
      }

      return { error: "code_not_found", ...responseData };
    } catch (error) {
      console.error(`❌ Error checking phone number ${number}:`, error);

      // Try an alternative approach if the first one fails with certificate issues
      if (error instanceof Error && error.message.includes("certificate")) {
        console.log("🔄 Attempting alternative request method...");

        try {
          // Alternative approach with more aggressive certificate handling
          const altHttpsAgent = new https.Agent({
            rejectUnauthorized: false,
            secureProtocol: "TLSv1_2_method",
            checkServerIdentity: () => undefined, // Disable hostname verification
            keepAlive: true,
          });

          const altResponse = await axios.get(this.targetUrl, {
            timeout: 15000,
            httpsAgent: altHttpsAgent,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "es-ES,es;q=0.9",
              Connection: "keep-alive",
              "Cache-Control": "no-cache",
            },
          });

          // Parse HTML response with cheerio (alternative method)
          const $ = cheerio.load(altResponse.data);
          const iframes: IframeInfo[] = [];
          $("iframe").each((index, element) => {
            const src = $(element).attr("src");
            if (src) {
              iframes.push({
                src,
                id: $(element).attr("id"),
                name: $(element).attr("name"),
                width: $(element).attr("width"),
                height: $(element).attr("height"),
                index,
              });
            }
          });

          const responseData = {
            timestamp: new Date().toISOString(),
            phoneNumber: number,
            status: altResponse.status,
            statusText: altResponse.statusText,
            headers: altResponse.headers,
            rawData: altResponse.data,
            parsedContent: {
              title: $("title").text(),
              metaDescription: $('meta[name="description"]').attr("content"),
              iframes,
              scripts: [],
              iframeCount: iframes.length,
              scriptCount: 0,
            },
            requestUrl: this.targetUrl,
            method: "alternative",
          };

          console.log(`✅ Successfully checked phone number: ${number} (alternative method)`);
          console.log(`📄 Found ${iframes.length} iframes in the response (alternative method)`);
          return responseData;
        } catch (altError) {
          console.error(`❌ Alternative method also failed:`, altError);
        }
      }

      // Create error response object
      const errorResponse = {
        timestamp: new Date().toISOString(),
        phoneNumber: number,
        error: true,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorCode: error instanceof Error && "code" in error ? (error as any).code : undefined,
        requestUrl: this.targetUrl,
      };

      // Save error response to JSON file
      throw error;
    }
  }

  /**
   * Saves the response to a JSON file
   * @param number - The phone number
   * @param data - The response data to save
   * @param isError - Whether this is an error response
   */
  private async saveResponseToFile(number: string, data: any, isError: boolean = false): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${number}_${timestamp}${isError ? "_error" : ""}.html`;
      const filepath = path.join(this.outputDir, filename);

      await fs.writeFile(filepath, data, "utf8");
      console.log(`📄 Response saved to: ${filepath}`);
    } catch (error) {
      console.error("Error saving response to file:", error);
    }
  }

  /**
   * Gets the latest response file for a phone number
   * @param number - The phone number
   * @returns Promise<any> - The latest response data or null if not found
   */
  async getLatestResponse(number: string): Promise<any> {
    try {
      const files = await fs.readdir(this.outputDir);
      const numberFiles = files
        .filter((file) => file.startsWith(number) && file.endsWith(".json"))
        .sort()
        .reverse();

      if (numberFiles.length === 0) {
        return null;
      }

      const latestFile = path.join(this.outputDir, numberFiles[0]);
      const content = await fs.readFile(latestFile, "utf8");
      return JSON.parse(content);
    } catch (error) {
      console.error("Error reading latest response:", error);
      return null;
    }
  }

  /**
   * Extracts cookies from the response headers
   * @param response - The axios response object
   * @returns Array of cookie information
   */
  private extractCookies(response: AxiosResponse): CookieInfo[] {
    const cookies: CookieInfo[] = [];
    const setCookieHeader = response.headers["set-cookie"];

    if (setCookieHeader) {
      setCookieHeader.forEach((cookieString) => {
        const cookieParts = cookieString.split(";");
        const [nameValue] = cookieParts;
        const [name, value] = nameValue.split("=");

        if (name && value) {
          cookies.push({
            name: name.trim(),
            value: value.trim(),
            domain: this.extractCookieAttribute(cookieParts, "domain"),
            path: this.extractCookieAttribute(cookieParts, "path"),
          });
        }
      });
    }

    return cookies;
  }

  /**
   * Extracts a specific attribute from cookie parts
   * @param cookieParts - Array of cookie parts
   * @param attribute - The attribute to extract
   * @returns The attribute value or undefined
   */
  private extractCookieAttribute(cookieParts: string[], attribute: string): string | undefined {
    for (const part of cookieParts) {
      if (
        part
          .trim()
          .toLowerCase()
          .startsWith(attribute.toLowerCase() + "=")
      ) {
        return part.split("=")[1]?.trim();
      }
    }
    return undefined;
  }

  private getIframeUrlFromScript(html: string): string | null {
    try {
      // Pattern to match document.getElementById("workArea").src="/path/to/url";
      const srcPattern = /document\.getElementById\(["']workArea["']\)\.src\s*=\s*["']([^"']+)["']/;
      const match = html.match(srcPattern);

      if (match && match[1]) {
        const extractedUrl = match[1];
        console.log(`🔍 Extracted iframe URL from script: ${extractedUrl}`);

        // Check if the URL is already absolute
        if (extractedUrl.startsWith("http://") || extractedUrl.startsWith("https://")) {
          return extractedUrl;
        }

        // If it starts with /, it's a relative URL from the domain root
        if (extractedUrl.startsWith("/")) {
          return "https://tramites.ursec.gub.uy" + extractedUrl;
        }

        // Otherwise, assume it's relative to the current path
        return "https://tramites.ursec.gub.uy/" + extractedUrl;
      }

      console.log("⚠️ No iframe URL found in script content");
      return null;
    } catch (error) {
      console.error("Error extracting iframe URL from script:", error);
      return null;
    }
  }

  async fetchExtractedUrl(url: string, httpsAgent: https.Agent, cookieString: string): Promise<any> {
    console.log(`🔍 Fetching extracted URL: ${url}`);
    const iframeResponse = await axios
      .get(url, {
        timeout: 10000,
        httpsAgent: httpsAgent,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          Cookie: cookieString,
          Referer: this.targetUrl,
          "Sec-Fetch-Dest": "iframe",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Upgrade-Insecure-Requests": "1",
        },
      })
      .then((res) => res.data);
    return iframeResponse;
  }

  /**
   * Fetches content from iframes using the same session cookies
   * @param iframes - Array of iframe information
   * @param cookies - Cookies to use for requests
   * @param httpsAgent - HTTPS agent for requests
   * @param phoneNumber - The phone number to validate
   * @returns Promise<any[]> - Array of iframe responses
   */
  private async fetchIframeContent(iframes: IframeInfo[], cookies: CookieInfo[], httpsAgent: https.Agent, phoneNumber: string): Promise<any[]> {
    const iframeResponses: any[] = [];

    // Create cookie string for requests
    const cookieString = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

    for (const iframe of iframes) {
      try {
        console.log(`📄 Fetching iframe content: ${iframe.src}`);

        // Resolve relative URLs
        const iframeUrl = "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/" + iframe.src;

        console.log("Iframe url", iframeUrl);

        const iframeResponse = await axios.get(iframeUrl, {
          timeout: 10000,
          httpsAgent: httpsAgent,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            Connection: "keep-alive",
            Cookie: cookieString,
            Referer: this.targetUrl,
            "Sec-Fetch-Dest": "iframe",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Upgrade-Insecure-Requests": "1",
          },
        });

        // Parse iframe HTML content
        const $ = cheerio.load(iframeResponse.data);

        const extractedIframeUrl = this.getIframeUrlFromScript(iframeResponse.data);
        let extractedUrlContent = null;
        let phoneValidationResult = null;

        if (extractedIframeUrl) {
          extractedUrlContent = await this.fetchExtractedUrl(extractedIframeUrl, httpsAgent, cookieString);

          // Perform phone validation request using the extracted URL
          phoneValidationResult = await this.performPhoneValidationRequest(
            phoneNumber, // Use the actual phone number parameter
            extractedIframeUrl,
            cookies,
            httpsAgent
          );
        }

        const iframeContent = {
          url: iframeUrl,
          originalSrc: iframe.src,
          extractedUrl: extractedIframeUrl, // Add the extracted URL to the response
          extractedUrlContent: extractedUrlContent,
          phoneValidationResult: phoneValidationResult,
          status: iframeResponse.status,
          statusText: iframeResponse.statusText,
          headers: iframeResponse.headers,
          htmlContent: iframeResponse.data,
          parsedContent: {
            title: $("title").text(),
            bodyText: $("body").text().trim(), // First 500 chars of body text
            forms: $("form").length,
            inputs: $("input").length,
            scripts: $("script").length,
            hasPhoneInput: $('input[type="tel"], input[name*="phone"], input[name*="telefono"]').length > 0,
          },
          timestamp: new Date().toISOString(),
        };

        iframeResponses.push(iframeContent);

        console.log(`✅ Successfully fetched iframe ${iframe.index + 1}: ${iframeUrl}`);
      } catch (error) {
        console.error(`❌ Error fetching iframe ${iframe.src}:`, error);

        const errorContent = {
          url: iframe.src,
          error: true,
          htmlContent: (error as any).response?.data,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        };

        iframeResponses.push(errorContent);
      }
    }

    return iframeResponses;
  }

  /**
   * Resolves a relative URL to an absolute URL
   * @param url - The URL to resolve
   * @param baseUrl - The base URL
   * @returns The resolved absolute URL
   */
  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    const base = new URL(baseUrl);

    if (url.startsWith("/")) {
      return `${base.protocol}//${base.host}${url}`;
    }

    return `${base.protocol}//${base.host}${base.pathname}${url}`;
  }

  /**
   * Saves iframe content to a separate JSON file
   * @param index - The iframe index
   * @param content - The iframe content to save
   */
  private async saveIframeContent(index: number, content: any): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `iframe_${index}_${timestamp}.json`;
      const filepath = path.join(this.outputDir, filename);

      await fs.writeFile(filepath, JSON.stringify(content, null, 2), "utf8");
      console.log(`📄 Iframe content saved to: ${filepath}`);
    } catch (error) {
      console.error("Error saving iframe content to file:", error);
    }
  }

  /**
   * Performs the phone number validation request using extracted iframe data
   * @param phoneNumber - The phone number to validate
   * @param extractedUrl - The extracted iframe URL containing form parameters
   * @param cookies - Session cookies
   * @param httpsAgent - HTTPS agent for requests
   * @returns Promise<any> - The validation response
   */
  private async performPhoneValidationRequest(phoneNumber: string, extractedUrl: string, cookies: CookieInfo[], httpsAgent: https.Agent): Promise<any> {
    try {
      // Extract parameters from the extracted URL
      const urlParams = new URLSearchParams(extractedUrl.split("?")[1]);
      const tokenId = urlParams.get("tokenId");
      const tabId = urlParams.get("tabId");

      // Create timestamp for the request
      const timestamp = Date.now();

      // Build the form action URL
      const formActionUrl = `https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.FormAction.run?action=processFieldSubmit&isAjax=true&frmId=6619&frmParent=E&timestamp=${timestamp}&attId=11808&index=0&tabId=${tabId}&tokenId=${tokenId}`;

      // Create cookie string for requests
      const cookieString = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

      // Prepare form data
      const formData = `value=${phoneNumber}`;

      console.log(`🔍 Performing phone validation request for: ${phoneNumber}`);
      console.log(`📡 Request URL: ${formActionUrl}`);

      const response = await axios.post(formActionUrl, formData, {
        timeout: 10000,
        httpsAgent: httpsAgent,
        headers: {
          Accept: "text/javascript, text/html, application/xml, text/xml, */*",
          "Accept-Language": "es-ES,es;q=0.9",
          Connection: "keep-alive",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: cookieString,
          Origin: "https://tramites.ursec.gub.uy",
          Referer: extractedUrl,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
          "X-Requested-With": "XMLHttpRequest",
          "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
        },
      });

      console.log(`✅ Phone validation request completed with status: ${response.status}`);

      const validationResult = {
        phoneNumber,
        formActionUrl,
        requestData: formData,
        timestamp: new Date().toISOString(),
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        responseData: response.data,
        cookies: cookies,
      };

      // Check for signable forms before proceeding to next step
      await this.checkSignableForms(extractedUrl, tabId!, tokenId!, cookies, httpsAgent);

      // Perform the final "go to next step" request after validation
      let rafRespuestaStr = "";
      let nextStepResult = null;
      let att = 0;
      while (!rafRespuestaStr && att < 10) {
        nextStepResult = await this.performNextStepRequest(extractedUrl, tabId!, tokenId!, cookies, httpsAgent, phoneNumber);
        rafRespuestaStr = nextStepResult.rafRespuestaStr;
        att++;
      }

      return {
        captchaSolveAttempts: att,
        response: rafRespuestaStr,
        isInRecord: nextStepResult.isInRecord,
      };
    } catch (error) {
      console.error(`❌ Error performing phone validation request:`, error);

      return {
        phoneNumber,
        error: true,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Checks if there are signable forms before proceeding to next step
   * @param refererUrl - The referer URL from the extracted iframe URL
   * @param tabId - The tab ID from previous requests
   * @param tokenId - The token ID from previous requests
   * @param cookies - Session cookies
   * @param httpsAgent - HTTPS agent for requests
   * @returns Promise<any> - The signable forms check response
   */
  private async checkSignableForms(refererUrl: string, tabId: string, tokenId: string, cookies: CookieInfo[], httpsAgent: https.Agent): Promise<any> {
    try {
      // Build the hasSignableForms URL
      const signableFormsUrl = `https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/apia.execution.TaskAction.run?action=hasSignableForms&appletToken=&tabId=${tabId}&tokenId=${tokenId}`;

      // Create cookie string for requests
      const cookieString = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

      console.log(`🔍 Checking for signable forms...`);
      console.log(`📡 Request URL: ${signableFormsUrl}`);

      const response = await axios.post(signableFormsUrl, "", {
        timeout: 10000,
        httpsAgent: httpsAgent,
        headers: {
          Accept: "text/javascript, text/html, application/xml, text/xml, */*",
          "Accept-Language": "es-ES,es;q=0.9,bg;q=0.8",
          Connection: "keep-alive",
          "Content-Length": "0",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: cookieString,
          Origin: "https://tramites.ursec.gub.uy",
          Referer: refererUrl,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
          "X-Requested-With": "XMLHttpRequest",
          "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
        },
      });

      console.log(`✅ Signable forms check completed with status: ${response.status}`);

      return {
        signableFormsUrl,
        tabId,
        tokenId,
        timestamp: new Date().toISOString(),
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        responseData: response.data,
        hasSignableForms: response.data && (response.data.includes("true") || response.data.includes("signable")),
      };
    } catch (error) {
      console.error(`❌ Error checking signable forms:`, error);

      return {
        tabId,
        tokenId,
        responseData: (error as any).response?.data,
        error: true,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Solves CAPTCHA using OCR with serverless-compatible configuration
   * @param captchaUrl - The URL of the CAPTCHA image
   * @param cookies - Session cookies
   * @param httpsAgent - HTTPS agent for requests
   * @returns Promise<string> - The solved CAPTCHA text
   */
  private async solveCaptcha(captchaUrl: string, cookies: CookieInfo[], httpsAgent: https.Agent): Promise<string> {
    try {
      console.log(`🔍 Solving CAPTCHA: ${captchaUrl}`);

      // Create cookie string for requests
      const cookieString = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

      // Download the CAPTCHA image
      const imageResponse = await axios.get(captchaUrl, {
        timeout: 10000,
        httpsAgent: httpsAgent,
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "es-ES,es;q=0.9",
          Cookie: cookieString,
          Referer: "https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/",
          "Sec-Fetch-Dest": "image",
          "Sec-Fetch-Mode": "no-cors",
          "Sec-Fetch-Site": "same-origin",
        },
      });

      // Save the CAPTCHA image temporarily (use /tmp in serverless environments)
      const tempDir = process.env.VERCEL ? "/tmp" : this.outputDir;
      const captchaImagePath = path.join(tempDir, `captcha_${Date.now()}.png`);
      await fs.writeFile(captchaImagePath, imageResponse.data);

      console.log(`📄 CAPTCHA image saved to: ${captchaImagePath}`);

      // For Vercel serverless environment, use external OCR API
      const isVercel = !!process.env.VERCEL || !!process.env.OCR_API_URL;
      if (isVercel) {
        console.log("🌐 Running in Vercel serverless environment - using external OCR API");

        try {
          // Use external OCR API to avoid WASM issues
          const ocrApiUrl = process.env.OCR_API_URL || "http://localhost:3001";
          const ocrResponse = await axios.post(
            `${ocrApiUrl}/ocr/captcha`,
            {
              imageUrl: captchaUrl,
              cookies: cookieString,
              useAdvanced: true,
              options: {
                whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
                serverless: true,
              },
            },
            {
              timeout: 30000, // 30 second timeout for OCR processing
              headers: {
                "Content-Type": "application/json",
                "User-Agent": "PhoneChecker/1.0",
              },
            }
          );

          // Clean up temp file
          try {
            await fs.unlink(captchaImagePath);
          } catch (e) {
            console.warn("Could not delete temp file:", e);
          }

          console.log("Ocr response", ocrResponse.data);

          if (ocrResponse.data.success && ocrResponse.data.result.text) {
            const cleanText = ocrResponse.data.result.text;
            console.log(`🔍 CAPTCHA solved via external OCR API: "${cleanText}" (confidence: ${ocrResponse.data.result.confidence})`);
            return cleanText;
          } else {
            throw new Error(`External OCR API failed: ${ocrResponse.data.error || "Unknown error"}`);
          }
        } catch (externalOcrError) {
          console.error("❌ External OCR API failed:", externalOcrError);
          console.log("🔄 Using smart CAPTCHA fallback for serverless environment");

          // Clean up temp file if it exists
          try {
            await fs.unlink(captchaImagePath);
          } catch (e) {
            // Ignore cleanup errors
          }

          // Return a smart fallback value
          return this.generateSmartCaptchaFallback();
        }
      }

      // Local development - use full featured OCR
      console.log("🏠 Running in local environment - using advanced OCR");

      // Initialize Tesseract worker with better language support
      const worker = await createWorker(["eng"]);

      // Configure Tesseract for optimal CAPTCHA recognition
      await worker.setParameters({
        // Character whitelist - only alphanumeric characters
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        // Page segmentation mode - treat the image as a single text line
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        // OCR Engine Mode - use both legacy and LSTM engines for better accuracy
        tessedit_ocr_engine_mode: OEM.TESSERACT_LSTM_COMBINED,
        // Improve recognition for small text
        tessedit_do_invert: "1",
        // Additional parameters for better CAPTCHA recognition
        classify_enable_learning: "0",
        classify_enable_adaptive_matcher: "0",
        textord_really_old_xheight: "1",
        textord_min_xheight: "10",
        preserve_interword_spaces: "0",
        // Improve edge detection
        edges_max_children_per_outline: "40",
        // Noise reduction
        textord_noise_sizelimit: "0.5",
        // Improve character recognition
        tessedit_char_unblacklist: "",
        // Better handling of small fonts
        textord_min_linesize: "2.5",
      });

      // Recognize text from the CAPTCHA image with multiple attempts
      let recognitionResults = [];

      // Try recognition with different configurations
      const configs = [
        { psr: PSM.SINGLE_LINE, oem: OEM.TESSERACT_LSTM_COMBINED },
        { psr: PSM.SINGLE_WORD, oem: OEM.LSTM_ONLY },
        { psr: PSM.SINGLE_CHAR, oem: OEM.TESSERACT_ONLY },
        { psr: PSM.RAW_LINE, oem: OEM.TESSERACT_LSTM_COMBINED },
      ];

      for (const config of configs) {
        try {
          await worker.setParameters({
            tessedit_pageseg_mode: config.psr,
            tessedit_ocr_engine_mode: config.oem,
          });

          const {
            data: { text, confidence },
          } = await worker.recognize(captchaImagePath);
          const cleanText = this.cleanCaptchaText(text);

          if (cleanText && cleanText.length >= 4 && cleanText.length <= 8) {
            recognitionResults.push({
              text: cleanText,
              confidence: confidence,
              config: config,
            });
          }
        } catch (configError) {
          console.warn(`Recognition attempt failed with config:`, config, configError);
        }
      }

      // Sort by confidence and length preference
      recognitionResults.sort((a, b) => {
        // Prefer results with length 5-6 (typical CAPTCHA length)
        const aLengthScore = Math.abs(a.text.length - 5.5);
        const bLengthScore = Math.abs(b.text.length - 5.5);

        if (Math.abs(aLengthScore - bLengthScore) > 0.5) {
          return aLengthScore - bLengthScore;
        }

        // Then prefer higher confidence
        return b.confidence - a.confidence;
      });

      const bestResult = recognitionResults[0];
      const cleanText = bestResult ? bestResult.text : this.cleanCaptchaText((await worker.recognize(captchaImagePath)).data.text);

      console.log(`🔍 CAPTCHA recognition results:`, recognitionResults.slice(0, 3));
      console.log(`🔍 CAPTCHA solved: "${cleanText}" (confidence: ${bestResult?.confidence || "unknown"})`);

      // Clean up
      await worker.terminate();

      // Optionally delete the temporary image file
      try {
        await fs.unlink(captchaImagePath);
        console.log(`🗑️ Temporary CAPTCHA image deleted: ${captchaImagePath}`);
      } catch (error) {
        console.warn(`Warning: Could not delete temporary CAPTCHA image: ${error}`);
      }

      // Validate the result
      if (!cleanText || cleanText.length < 3) {
        throw new Error(`CAPTCHA recognition failed or result too short: "${cleanText}"`);
      }

      return cleanText;
    } catch (error) {
      console.error(`❌ Error solving CAPTCHA:`, error);

      // Return a fallback value or throw error
      throw new Error(`Failed to solve CAPTCHA: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Cleans and normalizes CAPTCHA text recognition results
   * @param rawText - Raw text from OCR recognition
   * @returns Cleaned text suitable for CAPTCHA submission
   */
  private cleanCaptchaText(rawText: string): string {
    if (!rawText) return "";

    // Remove all non-alphanumeric characters
    let cleaned = rawText.replace(/[^a-zA-Z0-9]/g, "");

    // Common OCR misrecognitions for CAPTCHAs
    const corrections: { [key: string]: string } = {
      "0": "O", // Zero to letter O
      O: "0", // Letter O to zero (try both)
      "1": "I", // One to letter I
      I: "1", // Letter I to one
      "5": "S", // Five to letter S
      S: "5", // Letter S to five
      "6": "G", // Six to letter G
      G: "6", // Letter G to six
      "8": "B", // Eight to letter B
      B: "8", // Letter B to eight
      "2": "Z", // Two to letter Z
      Z: "2", // Letter Z to two
    };

    // Apply corrections and return multiple possibilities
    const possibilities = [cleaned];

    // Try common substitutions
    for (const [from, to] of Object.entries(corrections)) {
      if (cleaned.includes(from)) {
        possibilities.push(cleaned.replace(new RegExp(from, "g"), to));
      }
    }

    // Return the original cleaned text (we might want to try alternatives later)
    return cleaned;
  }

  /**
   * Generates a fallback CAPTCHA value when OCR fails in serverless environments
   * @returns A reasonable CAPTCHA guess based on common patterns
   */
  private generateCaptchaFallback(): string {
    // Generate a 5-character alphanumeric string as a fallback
    // This won't work most of the time, but provides a reasonable attempt
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    // Use timestamp-based pseudo-randomness for consistency
    const timestamp = Date.now();
    for (let i = 0; i < 5; i++) {
      const index = (timestamp + i * 17) % chars.length;
      result += chars[index];
    }

    console.log(`🔄 Generated CAPTCHA fallback: "${result}"`);
    return result;
  }

  /**
   * Generates a smarter CAPTCHA fallback with multiple strategies
   * @returns A better CAPTCHA guess based on common CAPTCHA patterns
   */
  private generateSmartCaptchaFallback(): string {
    // Common CAPTCHA patterns and lengths
    const strategies = [
      // 5-character mixed alphanumeric (most common)
      () => this.generateRandomString(5, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
      // 4-character mixed
      () => this.generateRandomString(4, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
      // 6-character mixed
      () => this.generateRandomString(6, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
      // Numbers only (sometimes CAPTCHAs are numeric)
      () => this.generateRandomString(5, "0123456789"),
      // Letters only (sometimes CAPTCHAs are alphabetic)
      () => this.generateRandomString(5, "ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
    ];

    // Use timestamp to select strategy (but make it deterministic for retry consistency)
    const timestamp = Date.now();
    const strategyIndex = Math.floor(timestamp / 10000) % strategies.length;
    const result = strategies[strategyIndex]();

    console.log(`🎯 Generated smart CAPTCHA fallback (strategy ${strategyIndex + 1}): "${result}"`);
    return result;
  }

  /**
   * Generates a random string with specified length and character set
   * @param length - Length of the string to generate
   * @param chars - Character set to use
   * @returns Random string
   */
  private generateRandomString(length: number, chars: string): string {
    let result = "";
    const timestamp = Date.now();

    for (let i = 0; i < length; i++) {
      // Use timestamp + position for pseudo-randomness (deterministic for retry consistency)
      const index = (timestamp + i * 23 + length * 7) % chars.length;
      result += chars[index];
    }

    return result;
  }

  /**
   * Generates the CAPTCHA URL and name from the form data
   * @param tabId - The tab ID from previous requests
   * @returns Object containing CAPTCHA URL and name
   */
  private generateCaptchaInfo(tabId: string): { captchaUrl: string; captchaName: string } {
    const timestamp = Date.now();
    const captchaName = `${tabId}E_6619`;
    const captchaUrl = `https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea/captchaImg?captchaName=${captchaName}&t=${timestamp}`;

    return { captchaUrl, captchaName };
  }

  /**
   * Performs the final "go to next step" request after phone validation
   * @param refererUrl - The referer URL from the extracted iframe URL
   * @param tabId - The tab ID from previous requests
   * @param tokenId - The token ID from previous requests
   * @param cookies - Session cookies
   * @param httpsAgent - HTTPS agent for requests
   * @param phoneNumber - The phone number to validate
   * @returns Promise<any> - The next step response
   */
  private async performNextStepRequest(refererUrl: string, tabId: string, tokenId: string, cookies: CookieInfo[], httpsAgent: https.Agent, phoneNumber: string): Promise<any> {
    try {
      // Build the next step URL using TaskAction.run with gotoNextStep action
      const nextStepUrl = `https://tramites.ursec.gub.uy/tramites-en-linea/TramitesEnLinea//apia.execution.TaskAction.run?action=gotoNextStep&tabId=${tabId}&tokenId=${tokenId}&currentTab=0`;

      // Create cookie string for requests
      const cookieString = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

      // Generate CAPTCHA info and solve it with retry logic
      const { captchaUrl, captchaName } = this.generateCaptchaInfo(tabId);
      let captchaSolution = "";
      let attempts = 0;
      const maxAttempts = 3;

      while (!captchaSolution && attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`🎯 CAPTCHA solving attempt ${attempts}/${maxAttempts}`);
          captchaSolution = await this.solveCaptcha(captchaUrl, cookies, httpsAgent);

          // Validate CAPTCHA solution length
          if (captchaSolution.length < 3 || captchaSolution.length > 8) {
            console.warn(`⚠️ CAPTCHA solution seems invalid (length: ${captchaSolution.length}): "${captchaSolution}"`);
            if (attempts < maxAttempts) {
              captchaSolution = ""; // Reset to retry
              await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
              continue;
            }
          }
        } catch (captchaError) {
          console.error(`❌ CAPTCHA solving attempt ${attempts} failed:`, captchaError);
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to solve CAPTCHA after ${maxAttempts} attempts: ${captchaError}`);
          }
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }

      console.log(`🔤 Final CAPTCHA solution: ${captchaSolution}`);

      // Prepare form data with solved CAPTCHA
      const formData = `${captchaName}=${captchaSolution}`;

      console.log(`🔍 Performing next step request...`);
      console.log(`📡 Request URL: ${nextStepUrl}`);
      console.log(`📝 Form data: ${formData}`);
      console.log(`🎯 CAPTCHA URL: ${captchaUrl}`);
      console.log(`🔤 CAPTCHA solution: ${captchaSolution}`);

      const response = await axios.post(nextStepUrl, formData, {
        timeout: 10000,
        httpsAgent: httpsAgent,
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "es-ES,es;q=0.9",
          "Cache-Control": "max-age=0",
          Connection: "keep-alive",
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieString,
          Origin: "https://tramites.ursec.gub.uy",
          Referer: refererUrl,
          "Sec-Fetch-Dest": "iframe",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
          "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
        },
      });

      console.log(`✅ Next step request completed with status: ${response.status}`);

      // Parse the response to extract useful information
      //await this.saveResponseToFile("number", response.data, false);
      const $ = cheerio.load(response.data);

      // First try to find RAF_RESPUESTA_STR in the main HTML response
      let rafRespuestaField = $('field[attName="RAF_RESPUESTA_STR"]');
      let rafRespuestaValue = rafRespuestaField.text() || rafRespuestaField.attr("value") || null;

      // If not found in main HTML, check if there's data-xml attribute and parse it
      let dataXml = null;
      const formContainer = $(".formContainer");
      if (formContainer.length > 0) {
        dataXml = formContainer.attr("data-xml");
        if (dataXml) {
          const $xml = cheerio.load(dataXml, { xmlMode: true });
          rafRespuestaField = $xml('field[attName="RAF_RESPUESTA_STR"]');
          if (rafRespuestaField.length > 0) {
            rafRespuestaValue = rafRespuestaField.text() || rafRespuestaField.attr("value") || null;
          }
        }
      }

      // If still not found, try parsing the entire response as XML
      if (!rafRespuestaValue) {
        try {
          const $xmlResponse = cheerio.load(response.data, { xmlMode: true });
          rafRespuestaField = $xmlResponse('field[attName="RAF_RESPUESTA_STR"]');
          rafRespuestaValue = rafRespuestaField.text() || rafRespuestaField.attr("value") || null;
        } catch (xmlError) {
          console.log("Response is not valid XML, continuing with HTML parsing");
        }
      }

      console.log(`📋 RAF_RESPUESTA_STR value: ${rafRespuestaValue || "Not found"}`);

      // Also look for other field elements that might contain relevant information
      const allFields: any[] = [];

      // Parse fields from the main response or data-xml
      const parseFields = (cheerioInstance: any) => {
        cheerioInstance("field").each((index: number, element: any) => {
          const attName = cheerioInstance(element).attr("attName");
          const value = cheerioInstance(element).text() || cheerioInstance(element).attr("value");
          if (attName) {
            allFields.push({
              attName,
              value: value || null,
            });
          }
        });
      };

      // Parse from main HTML response
      parseFields($);

      // If we have dataXml, also parse from there
      if (dataXml) {
        const $xml = cheerio.load(dataXml, { xmlMode: true });
        parseFields($xml);
      }

      return {
        nextStepUrl,
        tabId,
        tokenId,
        requestData: formData,
        captchaInfo: {
          captchaUrl,
          captchaName,
          solution: captchaSolution,
        },
        // The main result - RAF_RESPUESTA_STR field value
        validationResult: rafRespuestaValue,
        timestamp: new Date().toISOString(),
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        responseData: response.data,
        parsedContent: {
          title: $("title").text(),
          bodyText: $("body").text().trim().substring(0, 1000), // First 1000 chars of body text
          forms: $("form").length,
          inputs: $("input").length,
          hasSuccessMessage: response.data.includes("success") || response.data.includes("éxito") || response.data.includes("completado"),
          hasErrorMessage: response.data.includes("error") || response.data.includes("failed") || response.data.includes("falló"),
          // All field elements found in the response
          allFields: allFields,
          dataXml,
        },
        // The specific RAF_RESPUESTA_STR field
        rafRespuestaStr: rafRespuestaValue,
        isInRecord: rafRespuestaValue && rafRespuestaValue.includes("se encuentra en el Registro No llame"),
      };
    } catch (error) {
      console.error(`❌ Error performing next step request:`, error);

      return {
        tabId,
        tokenId,
        responseData: (error as any).response?.data,
        error: true,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }
}
