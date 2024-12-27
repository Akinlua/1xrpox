const detectCountry = (number) => {
    // Remove any non-digit characters
    const cleanNumber = number.replace(/\D/g, '');
    
    // Country codes mapping
    const countryPatterns = {
        '1': '1',    // USA/Canada
        '44': '44',  // UK
        '81': '81',  // Japan
        '86': '86',  // China
        '91': '91',  // India
        '7': '7',    // Russia
        '49': '49',  // Germany
        '33': '33',  // France
        '39': '39',  // Italy
        '34': '34',  // Spain
        '55': '55',  // Brazil
        '52': '52',  // Mexico
        '82': '82',  // South Korea
        '84': '84',  // Vietnam
        '66': '66',  // Thailand
        '63': '63',  // Philippines
        '62': '62',  // Indonesia
        '60': '60',  // Malaysia
        '65': '65',  // Singapore
        '234': '234', // Nigeria
        '27': '27',   // South Africa
        '20': '20',   // Egypt
        '254': '254', // Kenya
        '255': '255', // Tanzania
        '256': '256', // Uganda
        '251': '251', // Ethiopia
        '233': '233', // Ghana
        '225': '225', // Ivory Coast
        '228': '228', // Togo
        '221': '221', // Senegal
    };

    // Check for matches starting with longest possible code
    for (let i = 3; i > 0; i--) {
        const potentialCode = cleanNumber.substring(0, i);
        if (countryPatterns[potentialCode]) {
            return {
                code: countryPatterns[potentialCode],
                remainingNumber: cleanNumber.substring(i)
            };
        }
    }
    
    return null;
};

 console.log(detectCountry('27593908537'))

//  ui-option dropdown-phone-codes__country ui-option--theme-gray-100