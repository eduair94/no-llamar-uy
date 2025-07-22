import { PhoneNumberFormat, PhoneNumberType, PhoneNumberUtil } from "google-libphonenumber";

export class PhoneValidator {
  private phoneUtil: PhoneNumberUtil;

  constructor() {
    this.phoneUtil = PhoneNumberUtil.getInstance();
  }

  /**
   * Validates a Uruguayan phone number
   * @param phoneNumber - The phone number to validate
   * @returns object with validation results
   */
  validateUruguayanPhone(phoneNumber: string): {
    isValid: boolean;
    formatted?: string;
    type?: string;
    error?: string;
  } {
    try {
      // Parse the number with Uruguay country code
      const number = this.phoneUtil.parseAndKeepRawInput(phoneNumber, "UY");

      // Check if it's a valid number
      const isValid = this.phoneUtil.isValidNumber(number);

      if (!isValid) {
        return {
          isValid: false,
          error: "Invalid phone number format for Uruguay",
        };
      }

      // Check if it's specifically a Uruguayan number
      const region = this.phoneUtil.getRegionCodeForNumber(number);
      if (region !== "UY") {
        return {
          isValid: false,
          error: "Phone number is not from Uruguay",
        };
      }

      // Get formatted number
      const formatted = this.phoneUtil.format(number, PhoneNumberFormat.INTERNATIONAL);

      // Get number type
      const numberType = this.phoneUtil.getNumberType(number);
      const typeString = this.getNumberTypeString(numberType);

      return {
        isValid: true,
        formatted,
        type: typeString,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Unknown validation error",
      };
    }
  }

  /**
   * Converts number type enum to string
   * @param type - PhoneNumberType enum value
   * @returns string representation of the type
   */
  private getNumberTypeString(type: any): string {
    switch (type) {
      case PhoneNumberType.MOBILE:
        return "Mobile";
      case PhoneNumberType.FIXED_LINE:
        return "Fixed Line";
      case PhoneNumberType.FIXED_LINE_OR_MOBILE:
        return "Fixed Line or Mobile";
      case PhoneNumberType.TOLL_FREE:
        return "Toll Free";
      case PhoneNumberType.PREMIUM_RATE:
        return "Premium Rate";
      case PhoneNumberType.SHARED_COST:
        return "Shared Cost";
      case PhoneNumberType.VOIP:
        return "VoIP";
      case PhoneNumberType.PERSONAL_NUMBER:
        return "Personal Number";
      case PhoneNumberType.PAGER:
        return "Pager";
      case PhoneNumberType.UAN:
        return "UAN";
      case PhoneNumberType.VOICEMAIL:
        return "Voicemail";
      default:
        return "Unknown";
    }
  }

  /**
   * Normalizes a phone number for Uruguay to URSEC format (8 digits)
   * @param phoneNumber - The phone number to normalize (e.g., 59898297150)
   * @returns normalized phone number in URSEC format (e.g., 98297150) or null if invalid
   */
  normalizeUruguayanPhone(phoneNumber: string): string | null {
    try {
      // Parse the number with Uruguay country code
      const number = this.phoneUtil.parseAndKeepRawInput(phoneNumber, "UY");

      // Validate the number and ensure it's Uruguayan
      if (!this.phoneUtil.isValidNumber(number) || this.phoneUtil.getRegionCodeForNumber(number) !== "UY") {
        return null;
      }

      // Extract national number safely
      const nationalNumber = number.getNationalNumber();
      if (typeof nationalNumber !== "number" || nationalNumber <= 0) {
        return null;
      }

      // Convert to string for processing
      const nationalNumberStr = nationalNumber.toString();

      return nationalNumberStr;
    } catch (error) {
      return null;
    }
  }
}
