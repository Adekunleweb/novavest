// Country-specific signup fields
// Each country can have a specific national ID requirement
const countries = [
  { code: 'US', name: 'United States', idLabel: 'Social Security Number (SSN)', idPlaceholder: 'XXX-XX-XXXX', idType: 'SSN' },
  { code: 'NG', name: 'Nigeria', idLabel: 'National Identification Number (NIN)', idPlaceholder: '11-digit NIN', idType: 'NIN' },
  { code: 'GB', name: 'United Kingdom', idLabel: 'National Insurance Number (NINO)', idPlaceholder: 'e.g. QQ123456A', idType: 'NINO' },
  { code: 'CA', name: 'Canada', idLabel: 'Social Insurance Number (SIN)', idPlaceholder: 'XXX-XXX-XXX', idType: 'SIN' },
  { code: 'IN', name: 'India', idLabel: 'Aadhaar Number', idPlaceholder: '12-digit Aadhaar', idType: 'Aadhaar' },
  { code: 'AU', name: 'Australia', idLabel: 'Tax File Number (TFN)', idPlaceholder: 'XXX XXX XXX', idType: 'TFN' },
  { code: 'GH', name: 'Ghana', idLabel: 'Ghana Card Number', idPlaceholder: 'GHA-XXXXXXXXX-X', idType: 'GhanaCard' },
  { code: 'KE', name: 'Kenya', idLabel: 'National ID Number', idPlaceholder: 'Kenyan National ID', idType: 'KenyanID' },
  { code: 'ZA', name: 'South Africa', idLabel: 'ID Number', idPlaceholder: '13-digit SA ID', idType: 'SAID' },
  { code: 'DE', name: 'Germany', idLabel: 'Steueridentifikationsnummer (Tax ID)', idPlaceholder: '11-digit Tax ID', idType: 'TaxID' },
  { code: 'FR', name: 'France', idLabel: 'Numéro de Sécurité Sociale', idPlaceholder: '15-digit number', idType: 'FrenchSSN' },
  { code: 'BR', name: 'Brazil', idLabel: 'CPF Number', idPlaceholder: 'XXX.XXX.XXX-XX', idType: 'CPF' },
  { code: 'AE', name: 'United Arab Emirates', idLabel: 'Emirates ID Number', idPlaceholder: '784-XXXX-XXXXXXX-X', idType: 'EmiratesID' },
  { code: 'PH', name: 'Philippines', idLabel: 'PhilSys ID (PSN)', idPlaceholder: 'PhilSys Number', idType: 'PhilSys' },
  { code: 'PK', name: 'Pakistan', idLabel: 'CNIC Number', idPlaceholder: 'XXXXX-XXXXXXX-X', idType: 'CNIC' },
  { code: 'JM', name: 'Jamaica', idLabel: 'National Identification Number (NIN)', idPlaceholder: 'Jamaican NIN', idType: 'JamaicanNIN' },
  { code: 'EG', name: 'Egypt', idLabel: 'National ID Number', idPlaceholder: '14-digit National ID', idType: 'EgyptianID' },
  { code: 'MX', name: 'Mexico', idLabel: 'CURP', idPlaceholder: '18-character CURP', idType: 'CURP' },
  { code: 'ES', name: 'Spain', idLabel: 'DNI/NIE Number', idPlaceholder: 'DNI or NIE', idType: 'DNI' },
  { code: 'IT', name: 'Italy', idLabel: 'Codice Fiscale', idPlaceholder: '16-character code', idType: 'CodiceFiscale' },
  { code: 'SG', name: 'Singapore', idLabel: 'NRIC Number', idPlaceholder: 'S/T/F/G-XXXXXXX-X', idType: 'NRIC' },
  { code: 'MY', name: 'Malaysia', idLabel: 'IC Number (MyKad)', idPlaceholder: 'XXXXXX-XX-XXXX', idType: 'MyKad' },
  { code: 'BD', name: 'Bangladesh', idLabel: 'National ID Number', idPlaceholder: 'NID Number', idType: 'BangladeshNID' },
  { code: 'UG', name: 'Uganda', idLabel: 'National Identification Number (NIN)', idPlaceholder: 'Uganda NIN', idType: 'UgandaNIN' },
  { code: 'TZ', name: 'Tanzania', idLabel: 'National ID Number (NIDA)', idPlaceholder: 'NIDA Number', idType: 'NIDA' },
  { code: 'Other', name: 'Other Country', idLabel: 'Government ID / National ID Number', idPlaceholder: 'Enter your national ID', idType: 'OtherID' },
];

module.exports = countries;
