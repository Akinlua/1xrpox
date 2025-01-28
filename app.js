const path = require('path');
const fs = require('fs').promises;
const { Cluster } = require('puppeteer-cluster');
require('dotenv').config();
const puppeteer = process.env.NODE_ENV === 'development' ? require('puppeteer') : require('puppeteer-core');
const readline = require('readline');
const { Solver } = require('2captcha-ts');

function getResourcePath(relativePath) {
    return process.pkg ? 
        path.join(process.cwd(), relativePath) : 
        path.join(__dirname, relativePath);
}

class OTPSender {
    constructor() {
        this.config = {
            phoneNumbersFile: getResourcePath('./phone_numbers.txt'),
            proxyFile: getResourcePath('./proxies.txt'),
        };
        this.cluster = null;
        this.proxies = [];
        this.currentProxyIndex = 0;
        this.solver = new Solver('b2f661fd6f5a3a94d05900a8439c65bd');
    }

    getChromePath() {
        if (process.env.NODE_ENV === 'development') {
            return undefined; // Let puppeteer handle it in development
        }
        
        switch (process.platform) {
            case 'darwin': // MacOS
                return process.env.CHROME_PATH_MAC;
            case 'win32': // Windows
                return process.env.CHROME_PATH_WIN;
            default: // Linux and others
                return process.env.CHROME_PATH_LINUX;
        }
    }

    getBrowserOptions(proxy) {
        const isProduction = process.env.NODE_ENV === 'production';
        const defaultArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            ...(isProduction ? [
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ] : []),
            ...(proxy ? [`--proxy-server=${proxy}`] : [])
        ];

        const options = {
            headless: process.env.HEADLESS === 'true' ? 'new' : false,
            args: defaultArgs
        };

        // Only add executablePath in production
        if (isProduction) {
            options.executablePath = this.getChromePath();
        }

        return options;
    }

    async simulateHumanBehavior(page, phoneNumber) {
        try {

            // Function to detect country from phone number
            const detectCountry = (number) => {
                // Remove any non-digit characters
                const cleanNumber = number.replace(/\D/g, '');
                
                // Country codes mapping
                const countryPatterns = {
                    '1': '1',      // USA/Canada
                    '7': '7',      // Russia/Kazakhstan
                    '20': '20',    // Egypt
                    '27': '27',    // South Africa
                    '30': '30',    // Greece
                    '31': '31',    // Netherlands
                    '32': '32',    // Belgium
                    '33': '33',    // France
                    '34': '34',    // Spain
                    '36': '36',    // Hungary
                    '39': '39',    // Italy
                    '40': '40',    // Romania
                    '41': '41',    // Switzerland
                    '43': '43',    // Austria
                    '44': '44',    // UK
                    '45': '45',    // Denmark
                    '46': '46',    // Sweden
                    '47': '47',    // Norway
                    '48': '48',    // Poland
                    '49': '49',    // Germany
                    '51': '51',    // Peru
                    '52': '52',    // Mexico
                    '53': '53',    // Cuba
                    '54': '54',    // Argentina
                    '55': '55',    // Brazil
                    '56': '56',    // Chile
                    '57': '57',    // Colombia
                    '58': '58',    // Venezuela
                    '60': '60',    // Malaysia
                    '61': '61',    // Australia
                    '62': '62',    // Indonesia
                    '63': '63',    // Philippines
                    '64': '64',    // New Zealand
                    '65': '65',    // Singapore
                    '66': '66',    // Thailand
                    '81': '81',    // Japan
                    '82': '82',    // South Korea
                    '84': '84',    // Vietnam
                    '86': '86',    // China
                    '90': '90',    // Turkey
                    '91': '91',    // India
                    '92': '92',    // Pakistan
                    '93': '93',    // Afghanistan
                    '94': '94',    // Sri Lanka
                    '95': '95',    // Myanmar
                    '98': '98',    // Iran
                    '212': '212',  // Morocco
                    '213': '213',  // Algeria
                    '216': '216',  // Tunisia
                    '218': '218',  // Libya
                    '220': '220',  // Gambia
                    '221': '221',  // Senegal
                    '222': '222',  // Mauritania
                    '223': '223',  // Mali
                    '224': '224',  // Guinea
                    '225': '225',  // Ivory Coast
                    '226': '226',  // Burkina Faso
                    '227': '227',  // Niger
                    '228': '228',  // Togo
                    '229': '229',  // Benin
                    '230': '230',  // Mauritius
                    '231': '231',  // Liberia
                    '232': '232',  // Sierra Leone
                    '233': '233',  // Ghana
                    '234': '234',  // Nigeria
                    '235': '235',  // Chad
                    '236': '236',  // Central African Republic
                    '237': '237',  // Cameroon
                    '238': '238',  // Cape Verde
                    '239': '239',  // São Tomé and Príncipe
                    '240': '240',  // Equatorial Guinea
                    '241': '241',  // Gabon
                    '242': '242',  // Republic of the Congo
                    '243': '243',  // DR Congo
                    '244': '244',  // Angola
                    '245': '245',  // Guinea-Bissau
                    '246': '246',  // British Indian Ocean Territory
                    '248': '248',  // Seychelles
                    '249': '249',  // Sudan
                    '250': '250',  // Rwanda
                    '251': '251',  // Ethiopia
                    '252': '252',  // Somalia
                    '253': '253',  // Djibouti
                    '254': '254',  // Kenya
                    '255': '255',  // Tanzania
                    '256': '256',  // Uganda
                    '257': '257',  // Burundi
                    '258': '258',  // Mozambique
                    '260': '260',  // Zambia
                    '261': '261',  // Madagascar
                    '262': '262',  // Reunion
                    '263': '263',  // Zimbabwe
                    '264': '264',  // Namibia
                    '265': '265',  // Malawi
                    '266': '266',  // Lesotho
                    '267': '267',  // Botswana
                    '268': '268',  // Swaziland
                    '269': '269',  // Comoros
                    '297': '297',  // Aruba
                    '298': '298',  // Faroe Islands
                    '299': '299',  // Greenland
                    '350': '350',  // Gibraltar
                    '351': '351',  // Portugal
                    '352': '352',  // Luxembourg
                    '353': '353',  // Ireland
                    '354': '354',  // Iceland
                    '355': '355',  // Albania
                    '356': '356',  // Malta
                    '357': '357',  // Cyprus
                    '358': '358',  // Finland
                    '359': '359',  // Bulgaria
                    '370': '370',  // Lithuania
                    '371': '371',  // Latvia
                    '372': '372',  // Estonia
                    '373': '373',  // Moldova
                    '374': '374',  // Armenia
                    '375': '375',  // Belarus
                    '376': '376',  // Andorra
                    '377': '377',  // Monaco
                    '378': '378',  // San Marino
                    '380': '380',  // Ukraine
                    '381': '381',  // Serbia
                    '382': '382',  // Montenegro
                    '385': '385',  // Croatia
                    '386': '386',  // Slovenia
                    '387': '387',  // Bosnia and Herzegovina
                    '389': '389',  // Macedonia
                    '420': '420',  // Czech Republic
                    '421': '421',  // Slovakia
                    '423': '423',  // Liechtenstein
                    '500': '500',  // Falkland Islands
                    '501': '501',  // Belize
                    '502': '502',  // Guatemala
                    '503': '503',  // El Salvador
                    '504': '504',  // Honduras
                    '505': '505',  // Nicaragua
                    '506': '506',  // Costa Rica
                    '507': '507',  // Panama
                    '509': '509',  // Haiti
                    '590': '590',  // Guadeloupe
                    '591': '591',  // Bolivia
                    '592': '592',  // Guyana
                    '593': '593',  // Ecuador
                    '594': '594',  // French Guiana
                    '595': '595',  // Paraguay
                    '596': '596',  // Martinique
                    '597': '597',  // Suriname
                    '598': '598',  // Uruguay
                    '599': '599',  // Netherlands Antilles
                    '670': '670',  // East Timor
                    '672': '672',  // Norfolk Island
                    '673': '673',  // Brunei
                    '674': '674',  // Nauru
                    '675': '675',  // Papua New Guinea
                    '676': '676',  // Tonga
                    '677': '677',  // Solomon Islands
                    '678': '678',  // Vanuatu
                    '679': '679',  // Fiji
                    '680': '680',  // Palau
                    '681': '681',  // Wallis and Futuna
                    '682': '682',  // Cook Islands
                    '683': '683',  // Niue
                    '685': '685',  // Samoa
                    '686': '686',  // Kiribati
                    '687': '687',  // New Caledonia
                    '688': '688',  // Tuvalu
                    '689': '689',  // French Polynesia
                    '690': '690',  // Tokelau
                    '691': '691',  // Micronesia
                    '692': '692',  // Marshall Islands
                    '850': '850',  // North Korea
                    '852': '852',  // Hong Kong
                    '853': '853',  // Macau
                    '855': '855',  // Cambodia
                    '856': '856',  // Laos
                    '880': '880',  // Bangladesh
                    '886': '886',  // Taiwan
                    '960': '960',  // Maldives
                    '961': '961',  // Lebanon
                    '962': '962',  // Jordan
                    '963': '963',  // Syria
                    '964': '964',  // Iraq
                    '965': '965',  // Kuwait
                    '966': '966',  // Saudi Arabia
                    '967': '967',  // Yemen
                    '968': '968',  // Oman
                    '970': '970',  // Palestinian Territory
                    '971': '971',  // United Arab Emirates
                    '972': '972',  // Israel
                    '973': '973',  // Bahrain
                    '974': '974',  // Qatar
                    '975': '975',  // Bhutan
                    '976': '976',  // Mongolia
                    '977': '977',  // Nepal
                    '992': '992',  // Tajikistan
                    '993': '993',  // Turkmenistan
                    '994': '994',  // Azerbaijan
                    '995': '995',  // Georgia
                    '996': '996',  // Kyrgyzstan
                    '998': '998',  // Uzbekistan
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
            // Add more realistic browser fingerprinting
            await page.evaluateOnNewDocument(() => {
                // Override WebGL fingerprint
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(parameter) {
                    if (parameter === 37445) {
                        return 'Intel Open Source Technology Center';
                    }
                    if (parameter === 37446) {
                        return 'Mesa DRI Intel(R) HD Graphics (SKL GT2)';
                    }
                    return getParameter.apply(this, arguments);
                };

                // Add more realistic navigator properties
                Object.defineProperties(navigator, {
                    hardwareConcurrency: { value: 8 },
                    deviceMemory: { value: 8 },
                    platform: { value: 'Win32' },
                    maxTouchPoints: { value: 0 },
                    languages: { value: ['en-US', 'en'] },
                    vendor: { value: 'Google Inc.' }
                });

                // Add realistic screen properties
                Object.defineProperties(screen, {
                    colorDepth: { value: 24 },
                    pixelDepth: { value: 24 }
                });

                // Add audio context fingerprint
                const originalGetChannelData = AudioBuffer.prototype.getChannelData;
                AudioBuffer.prototype.getChannelData = function(channel) {
                    const data = originalGetChannelData.call(this, channel);
                    if (data.length < 100) return data;
                    
                    // Add slight noise to audio data
                    const noise = 0.0000001;
                    for(let i = 0; i < data.length; i += 100) {
                        data[i] += (Math.random() * 2 - 1) * noise;
                    }
                    return data;
                };
            });

            // Initial random delay with variation
            const initialDelay = Math.floor(Math.random() * 1000) + 500;
            await randomDelay(initialDelay, initialDelay + 500);

            // Simulate mouse movement before any action
            await page.mouse.move(
                200 + Math.random() * 100,
                150 + Math.random() * 50,
                { steps: 10 + Math.floor(Math.random() * 5) }
            );

            // Click country dropdown with natural movement
            const dropdownSelector = '.dropdown-phone-codes__button';
            const dropdown = await page.waitForSelector(dropdownSelector, { 
                visible: true,
                timeout: 10000 
            });

            // Move to dropdown naturally
            await naturalMouseMove(page, dropdown);
            await randomDelay(200, 400);
            await dropdown.click();

            // Detect country from phone number
            const countryInfo = detectCountry(phoneNumber);
            if (!countryInfo) {
                throw new Error('Could not detect country from phone number');
            }

            // Type country code with human-like behavior
            const searchSelector = '.input__field.input-field';
            await humanType(page, searchSelector, countryInfo.code);

            // Simulate human pause between inputs
            await randomDelay(500, 1000);

            const clickSelector = '.vue-recycle-scroller__item-wrapper'
            const click = await page.waitForSelector(clickSelector, { 
                visible: true,
                timeout: 10000 
            });
            await click.click();

        
            // Type phone number with human-like behavior
            const phoneInputSelector = 'input[type="tel"]';
            await humanType(page, phoneInputSelector, countryInfo.remainingNumber);

            // Random scroll behavior
            if (Math.random() > 0.7) {
                await page.mouse.wheel({ deltaY: Math.random() * 100 });
                await randomDelay(300, 600);
            }

            // Move to submit button naturally
            const buttonSelector = 'button.ui-button.registration-field-phone-with-country-actions';
            const button = await page.waitForSelector(buttonSelector);
            await naturalMouseMove(page, button);
            await randomDelay(200, 400);
            await button.click();

            // Handle potential captcha
            const result = await Promise.race([
                page.waitForSelector('.ui-status-icon.ui-popup__icon.ui-status-icon--status-success.ui-status-icon--size-l', { timeout: 1800000 }),
                page.waitForSelector('.pain-puzzle', { timeout: 1800000 })
            ]);

            if (await page.$('.pain-puzzle')) {
                const solved = await this.solveCaptchaPuzzle(page, 3);
                if (!solved) {
                    throw new Error('Failed to solve captcha after maximum attempts');
                }
            }

            console.log(`✓ OTP sent successfully to ${phoneNumber}`);

        } catch (error) {
            console.error(`Failed to process ${phoneNumber}: ${error.message}`);
            throw error;
        }
    }

    async loadProxies() {
        try {
            const proxyContent = await fs.readFile(this.config.proxyFile, 'utf8');
            this.proxies = proxyContent
                .split('\n')
                .map(line => line.trim())
                .filter(line => {
                    // Filter out empty lines and validate IP:PORT format
                    const parts = line.split(':');
                    return parts.length === 2 && parts[0].trim() && parts[1].trim();
                });
            console.log(this.proxies);

            if (this.proxies.length === 0) {
                console.log('No valid proxies found in file. Will proceed without proxy.');
                this.config.useProxy = false;
            } else {
                console.log(`Loaded ${this.proxies.length} proxies`);
                console.log('First few proxies:', this.proxies.slice(0, 3));
            }
        } catch (error) {
            console.warn('Error loading proxies file:', error);
            this.config.useProxy = false;
        }
    }

    getNextProxy() {
        if (!this.proxies.length) return null;
        
        // Get current proxy
        const proxy = this.proxies[this.currentProxyIndex];
        
        // Move to next proxy, reset to 0 if at end
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
        
        return proxy;
    }

    async getUserConfig() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const askQuestion = (question) => new Promise((resolve) => {
            rl.question(question, resolve);
        });

        try {
            // Get concurrent browsers
            let concurrentBrowsers;
            do {
                const answer = await askQuestion('How many browsers to run at a time? (1-100): ');
                concurrentBrowsers = parseInt(answer);
            } while (isNaN(concurrentBrowsers) || concurrentBrowsers < 1 || concurrentBrowsers > 100);

            // Get proxy usage
            const useProxy = (await askQuestion('Use proxies? (y/n): ')).toLowerCase() === 'y';

            rl.close();
            
            return {
                concurrentBrowsers,
                useProxy
            };
        } catch (error) {
            rl.close();
            throw error;
        }
    }

    async initCluster(concurrentBrowsers) {
        const isVPS = process.env.IS_VPS === 'true';

        this.cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            maxConcurrency: concurrentBrowsers,
            monitor: false,
            skipDuplicates: false,
            puppeteerOptions: {
                executablePath: this.getChromePath(),
                headless: isVPS ? 'new' : false,
                args: this.proxies.length > 0 ? [`--proxy-server=http://${this.getNextProxy()}`, '--no-sandbox', '--disable-setuid-sandbox'] : [],
                // args: [
                //         '--no-sandbox',
                //         '--disable-setuid-sandbox',
                //     // '--disable-dev-shm-usage',
                //     // '--disable-gpu',
                //     // '--no-zygote',
                //     // '--single-process',
                //     // '--disable-features=IsolateOrigins,site-per-process',
                //     // ...(isVPS ? [
                //     //     '--disable-software-rasterizer',
                //     //     '--disable-extensions',
                //     //     '--window-size=1920,1080'
                //     // ] : []),
                // ],
            },
            timeout: 180000,
            retryLimit: 3,
            retryDelay: 5000,
        });

        this.cluster.task(async ({ page, data: phoneNumber }) => {
            const proxy = this.config.useProxy ? this.getNextProxy() : null;
            console.log(`Using proxy ${this.currentProxyIndex}/${this.proxies.length}: ${proxy || 'No proxy'}`);
            
            try {
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                
                // Add viewport and other browser settings
                await page.setViewport({
                    width: 1366 + Math.floor(Math.random() * 100),
                    height: 768 + Math.floor(Math.random() * 100),
                    deviceScaleFactor: 1
                });
        
                // Set common browser features
                await page.evaluateOnNewDocument(() => {
                    Object.defineProperty(navigator, 'webdriver', { get: () => false });
                    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                    Object.defineProperty(navigator, 'plugins', { get: () => [
                        { name: 'Chrome PDF Plugin' },
                        { name: 'Chrome PDF Viewer' },
                        { name: 'Native Client' }
                    ]});
                });
        
                // Add to your initCluster method before page operations
                await page.evaluateOnNewDocument(() => {
                    // Override permissions
                    const originalQuery = window.navigator.permissions.query;
                    window.navigator.permissions.query = (parameters) => (
                        parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                    );
                    
                    // Add more realistic navigator properties
                    Object.defineProperties(navigator, {
                        hardwareConcurrency: { value: 8 },
                        deviceMemory: { value: 8 },
                        platform: { value: 'Win32' },
                        maxTouchPoints: { value: 0 }
                    });
                    
                    // Add canvas noise
                    const originalGetContext = HTMLCanvasElement.prototype.getContext;
                    HTMLCanvasElement.prototype.getContext = function(type) {
                        const context = originalGetContext.apply(this, arguments);
                        if (type === '2d') {
                            const originalFillText = context.fillText;
                            context.fillText = function() {
                                context.shadowColor = `rgba(0,0,0,${Math.random() * 0.01})`;
                                return originalFillText.apply(this, arguments);
                            }
                        }
                        return context;
                    };
                });
        
                // Increase timeout and add retry logic for navigation
                let maxRetries = 3;
                while (maxRetries > 0) {
                    try {
                        await page.goto('https://1xbetjap.com/en/registration?bonus=SPORT&type=phone', {
                            waitUntil: 'networkidle0', // Changed from networkidle0 to be less strict
                            timeout: 1800000 // Increased timeout
                        });
                        break; // If successful, exit retry loop
                    } catch (error) {
                        maxRetries--;
                        if (maxRetries === 0) throw error;
                        console.log(`Navigation failed, retrying... (${maxRetries} attempts left)`);
                        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
                    }
                }
        
                // Execute human-like behavior
                await this.simulateHumanBehavior(page, phoneNumber);
                
                // Keep browser open for verification
                await new Promise(resolve => setTimeout(resolve, 2000));
        
            } catch (error) {
                console.error(`Error processing ${phoneNumber}: ${error.message}`);
                throw error;
            }
        });
    }

    async solveCaptchaPuzzle(page, maxAttempts = 3) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            console.log(`Puzzle solving attempt ${attempts}/${maxAttempts}`);
            
            try {
                // Wait for the puzzle container
                await page.waitForSelector('.pain-puzzle', { 
                    visible: true,
                    timeout: 30000 
                });

                // Wait for both images to be present and loaded
                await page.waitForSelector('.pain-puzzle__order-image', {
                    visible: true,
                    timeout: 60000
                });
                await page.waitForSelector('.pain-puzzle__task-image', {
                    visible: true,
                    timeout: 60000
                });

                // Get the puzzle container position and dimensions
                const puzzleContainer = await page.$('.pain-puzzle__task-image-container');
                const containerBox = await puzzleContainer.boundingBox();

                // Get the base64 images directly from src attributes
                const [orderImageBase64, puzzleImageBase64] = await Promise.all([
                    page.$('.pain-puzzle__order-image').then(element => 
                        page.evaluate(el => el.getAttribute('src'), element)
                    ),
                    page.$('.pain-puzzle__task-image').then(element => 
                        page.evaluate(el => el.getAttribute('src'), element)
                    )
                ]);
                
                // Remove the data:image/png;base64 prefix
                const orderImage = orderImageBase64.split('base64,')[1];
                const puzzleImage = puzzleImageBase64.split('base64,')[1];

                // Send to 2captcha
                const response = await this.solver.coordinates({
                    body: puzzleImageBase64,
                    imginstructions: orderImageBase64,
                    textinstructions: 'Click in this order',
                });
                
                if (!response || !response.data) {
                    throw new Error('Failed to get solution from 2captcha');
                }
                
                const coordinates = response.data;

                // Click the coordinates in order, adjusting for container position
                for (const coordinate of coordinates) {
                    const absoluteX = containerBox.x + Number(coordinate.x);
                    const absoluteY = containerBox.y + Number(coordinate.y);

                    // Move mouse naturally
                    await page.mouse.move(absoluteX, absoluteY, {
                        steps: 10
                    });
                    
                    await randomDelay(200, 500);
                    await page.mouse.click(absoluteX, absoluteY);
                    await randomDelay(300, 800);
                }

                // Click send button
                const sendButton = await page.waitForSelector('.pain-puzzle__button.pain-puzzle__button--send', {
                    visible: true,
                    timeout: 30000
                });
                await naturalMouseMove(page, sendButton);
                await randomDelay(300, 600);
                await sendButton.click();

                // Modified success check with proper timeout
                try {
                    // Wait specifically for success message first
                    const successSelector = '.ui-status-icon.ui-popup__icon.ui-status-icon--status-success.ui-status-icon--size-l';
                    await page.waitForSelector(successSelector, { 
                        visible: true, 
                        timeout: 1800000
                    });
                    console.log('Captcha solved successfully!');
                    return true;
                } catch (successError) {
                    // Only if success message isn't found, check for new puzzle
                    const newPuzzle = await page.$('.pain-puzzle');
                    if (newPuzzle) {
                        console.log('New puzzle generated, retrying...');
                        await randomDelay(1000, 2000);
                        continue;
                    } else {
                        // Double check for success message in case it appeared during check
                        const successMessage = await page.$(successSelector);
                        if (successMessage) {
                            console.log('Captcha solved successfully!');
                            return true;
                        }
                    }
                }
                
            } catch (error) {
                console.error(`Failed puzzle attempt ${attempts}:`, error);
                await page.screenshot({ path: `error-puzzle-attempt-${attempts}-${Date.now()}.png` });
                
                if (attempts === maxAttempts) {
                    throw new Error(`Failed to solve captcha after ${maxAttempts} attempts`);
                }
                
                await randomDelay(2000, 4000);
            }
        }
        
        return false;
    }

    async start() {
        try {
            const userConfig = await this.getUserConfig();
            this.config.useProxy = userConfig.useProxy;

            if (this.config.useProxy) {
                await this.loadProxies();
            }

            await this.initCluster(userConfig.concurrentBrowsers);
            console.log(`Starting with ${userConfig.concurrentBrowsers} parallel browsers, Proxy: ${this.config.useProxy ? 'Yes' : 'No'}`);

           
            const phoneNumbers = await fs.readFile(this.config.phoneNumbersFile, 'utf8');
            const numbers = phoneNumbers.split('\n').filter(num => num.trim());

            if (numbers.length > 0) {
                console.log(`Processing ${numbers.length} numbers...`);
                await Promise.all(numbers.map(number => this.cluster.queue(number)));
                await this.cluster.idle();
                console.log('All numbers processed. Closing browsers...');
                await this.cluster.close();
                process.exit(0);
            } else {
                console.log('No numbers to process.');
                await this.cluster.close();
                process.exit(0);
            }
        } catch (error) {
            console.error('Error:', error);
            if (this.cluster) await this.cluster.close();
            process.exit(1);
        }
    }
}

// Usage
const sender = new OTPSender();
sender.start(); 

// Add natural random delays between actions
const randomDelay = (min, max) => new Promise(resolve => 
    setTimeout(resolve, Math.random() * (max - min) + min)
);

// Add mouse movement patterns
const naturalMouseMove = async (page, element) => {
    const box = await element.boundingBox();
    const offset = {
        x: Math.random() * (box.width / 2),
        y: Math.random() * (box.height / 2)
    };
    
    await page.mouse.move(
        box.x + box.width / 2 + offset.x,
        box.y + box.height / 2 + offset.y,
        { steps: 25 + Math.floor(Math.random() * 10) }
    );
}; 

const humanType = async (page, selector, text) => {
    await page.focus(selector);
    for (const char of text) {
        await page.keyboard.type(char, {
            delay: Math.random() * 100 + 30
        });
        
        // Occasional longer pauses
        if (Math.random() < 0.1) {
            await randomDelay(100, 300);
        }
        
        // Occasional typo and correction
        if (Math.random() < 0.05) {
            await page.keyboard.press('Backspace');
            await randomDelay(200, 400);
            await page.keyboard.type(char, { delay: 50 });
        }
    }
}; 