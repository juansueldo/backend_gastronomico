export function parseLocaleNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (typeof value !== 'string') {
    return Number.NaN;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return Number.NaN;
  }

  const compactValue = trimmedValue.replace(/\s+/g, '');
  if (!/^[-+]?\d[\d.,]*$/.test(compactValue)) {
    return Number.NaN;
  }

  const commaCount = (compactValue.match(/,/g) || []).length;
  const dotCount = (compactValue.match(/\./g) || []).length;

  let normalizedValue = compactValue;

  if (commaCount > 0 && dotCount > 0) {
    const lastCommaIndex = compactValue.lastIndexOf(',');
    const lastDotIndex = compactValue.lastIndexOf('.');
    const decimalSeparator = lastCommaIndex > lastDotIndex ? ',' : '.';
    const thousandSeparator = decimalSeparator === ',' ? '.' : ',';

    normalizedValue = compactValue
      .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
      .replace(decimalSeparator, '.');
  } else if (commaCount > 0) {
    if (commaCount > 1) {
      normalizedValue = compactValue.replace(/,/g, '');
    } else {
      const [integerPart, fractionPart = ''] = compactValue.split(',');
      normalizedValue = fractionPart.length <= 2
        ? `${integerPart}.${fractionPart}`
        : `${integerPart}${fractionPart}`;
    }
  } else if (dotCount > 0) {
    if (dotCount > 1) {
      normalizedValue = compactValue.replace(/\./g, '');
    } else {
      const [integerPart, fractionPart = ''] = compactValue.split('.');
      normalizedValue = fractionPart.length <= 2
        ? compactValue
        : `${integerPart}${fractionPart}`;
    }
  }

  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : Number.NaN;
}
