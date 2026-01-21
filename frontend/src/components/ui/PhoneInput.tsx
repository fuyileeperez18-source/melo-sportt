import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CountryCode {
  code: string; // +57, +1, etc.
  label: string; // Colombia (+57), Estados Unidos (+1), etc.
}

const COUNTRY_CODES: CountryCode[] = [
  { code: '+57', label: 'Colombia (+57)' },
  { code: '+1', label: 'Estados Unidos (+1)' },
  { code: '+52', label: 'México (+52)' },
  { code: '+34', label: 'España (+34)' },
  { code: '+54', label: 'Argentina (+54)' },
  { code: '+58', label: 'Venezuela (+58)' },
  { code: '+51', label: 'Perú (+51)' },
  { code: '+56', label: 'Chile (+56)' },
  { code: '+55', label: 'Brasil (+55)' },
  { code: '+593', label: 'Ecuador (+593)' },
  { code: '+506', label: 'Costa Rica (+506)' },
  { code: '+52', label: 'México (+52)' },
  { code: '+502', label: 'Guatemala (+502)' },
  { code: '+505', label: 'Nicaragua (+505)' },
  { code: '+503', label: 'El Salvador (+503)' },
  { code: '+507', label: 'Panamá (+507)' },
  { code: '+598', label: 'Uruguay (+598)' },
  { code: '+591', label: 'Bolivia (+591)' },
  { code: '+595', label: 'Paraguay (+595)' },
  { code: '+240', label: 'Guinea Ecuatorial (+240)' },
  { code: '+62', label: 'Indonesia (+62)' },
  { code: '+65', label: 'Singapur (+65)' },
  { code: '+60', label: 'Malasia (+60)' },
  { code: '+81', label: 'Japón (+81)' },
  { code: '+82', label: 'Corea del Sur (+82)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+852', label: 'Hong Kong (+852)' },
  { code: '+853', label: 'Macao (+853)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+64', label: 'Nueva Zelanda (+64)' },
  { code: '+44', label: 'Reino Unido (+44)' },
  { code: '+33', label: 'Francia (+33)' },
  { code: '+49', label: 'Alemania (+49)' },
  { code: '+39', label: 'Italia (+39)' },
  { code: '+31', label: 'Países Bajos (+31)' },
  { code: '+41', label: 'Suiza (+41)' },
  { code: '+32', label: 'Bélgica (+32)' },
  { code: '+48', label: 'Polonia (+48)' },
  { code: '+7', label: 'Rusia (+7)' },
  { code: '+90', label: 'Turquía (+90)' },
  { code: '+971', label: 'Emiratos Árabes Unidos (+971)' },
  { code: '+966', label: 'Arabia Saudita (+966)' },
  { code: '+20', label: 'Egipto (+20)' },
  { code: '+27', label: 'Sudáfrica (+27)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+254', label: 'Kenia (+254)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+92', label: 'Pakistán (+92)' },
  { code: '+880', label: 'Bangladés (+880)' },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  defaultCountryCode?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  name,
  required,
  placeholder,
  disabled,
  defaultCountryCode = '+57',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    COUNTRY_CODES.find(c => c.code === defaultCountryCode) || COUNTRY_CODES[0]
  );

  // Extraer código de país y número del formato almacenado
  const parsePhoneValue = () => {
    if (!value) return { countryCode: selectedCountry.code, number: '' };

    // Buscar si el valor tiene el formato con código de país
    const match = value.match(/^\(\+(\d+)\)\s*(.+)$/);
    if (match) {
      const [, code, number] = match;
      const countryCode = `+${code}`;
      const country = COUNTRY_CODES.find(c => c.code === countryCode);
      return {
        countryCode: country?.code || selectedCountry.code,
        number: number || ''
      };
    }

    // Si no tiene formato especial, asumir que es solo el número
    return { countryCode: selectedCountry.code, number: value };
  };

  const handleCountryChange = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsOpen(false);
    const parsed = parsePhoneValue();
    onChange(`(${country.code}) ${parsed.number}`);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const number = e.target.value.replace(/\D/g, ''); // Solo números
    onChange(`(${selectedCountry.code}) ${number}`);
  };

  const formatDisplay = () => {
    const parsed = parsePhoneValue();
    setSelectedCountry(COUNTRY_CODES.find(c => c.code === parsed.countryCode) || selectedCountry);
    return parsed.number;
  };

  return (
    <div className="flex gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`h-10 px-3 border rounded-lg flex items-center gap-2 bg-primary-950 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-800/50 cursor-pointer'
          }`}
          disabled={disabled}
        >
          <span className="text-sm">{selectedCountry.code}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 w-64 max-h-64 overflow-y-auto bg-primary-900 border border-primary-700 rounded-lg shadow-lg">
            {COUNTRY_CODES.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountryChange(country)}
                className="w-full px-3 py-2 text-left hover:bg-primary-700/50 transition-colors flex items-center justify-between group"
              >
                <span className="text-sm">
                  {country.label}
                </span>
                {selectedCountry.code === country.code && (
                  <span className="text-blue-400 text-sm font-medium">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1">
        <input
          type="tel"
          name={name}
          value={formatDisplay()}
          onChange={handleNumberChange}
          placeholder={placeholder || 'Número de teléfono'}
          required={required}
          disabled={disabled}
          className="w-full h-10 px-3 border border-primary-600 rounded-lg bg-primary-950 text-white placeholder-gray-400 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 disabled:opacity-50"
        />
      </div>
    </div>
  );
};

// Helpers para formatear y procesar números
declare global {
  interface String {
    toCleanPhoneNumber(): string;
    toDisplayPhoneNumber(): string;
    toInternationalPhoneNumber(): string;
  }
}

// Extraer solo los números sin el prefijo
declare global {
  interface String {
    extractPhoneNumber(): string;
    extractCountryCode(): string;
  }
}

// Extender String prototype para funciones de teléfono
if (!String.prototype.extractCountryCode) {
  Object.defineProperty(String.prototype, 'extractCountryCode', {
    value: function() {
      const match = String(this).match(/^\(\+(\d+)\)/);
      return match ? `+${match[1]}` : '+57'; // Default a Colombia
    },
    enumerable: false,
    configurable: false,
  });
}

if (!String.prototype.extractPhoneNumber) {
  Object.defineProperty(String.prototype, 'extractPhoneNumber', {
    value: function() {
      const match = String(this).match(/^\(\+\d+\)\s*(.+)$/);
      return match ? match[1] : String(this).replace(/\D/g, '');
    },
    enumerable: false,
    configurable: false,
  });
}

if (!String.prototype.toInternationalPhoneNumber) {
  Object.defineProperty(String.prototype, 'toInternationalPhoneNumber', {
    value: function() {
      const countryCode = String(this).extractCountryCode();
      const phoneNumber = String(this).extractPhoneNumber();

      // Extraer solo los dígitos del código de país
      const cleanCountryCode = countryCode.replace('\\+', '');
      return `${cleanCountryCode}${phoneNumber}`;
    },
    enumerable: false,
    configurable: false,
  });
}

// Normalizar para Wompi (eliminar el + y dejar solo números)
declare global {
  interface String {
    toWompiPhoneNumber(): string;
  }
}

if (!String.prototype.toWompiPhoneNumber) {
  Object.defineProperty(String.prototype, 'toWompiPhoneNumber', {
    value: function() {
      const internationalFormat = String(this).toInternationalPhoneNumber();
      return internationalFormat.replace(/\D/g, '');
    },
    enumerable: false,
    configurable: false,
  });
}

export default PhoneInput;
