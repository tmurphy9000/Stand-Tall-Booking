export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

// Formats a 10-digit (optionally 11-digit with leading 1) US phone number as (XXX) XXX-XXXX.
// Returns the original value unchanged if it doesn't look like a US phone number.
export function formatPhoneNumber(phone?: string | null): string {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
        digits = digits.slice(1);
    }
    if (digits.length !== 10) return phone;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}