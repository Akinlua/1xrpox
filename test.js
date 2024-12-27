const { Cluster } = require('puppeteer-cluster');
require('dotenv').config();
const puppeteer = process.env.NODE_ENV === 'development' ? require('puppeteer') : require('puppeteer-core');
const fs = require('fs').promises;
const readline = require('readline');
const path = require('path');

class OTPSender {
    constructor() {
        this.config = {
            phoneNumbersFile: './phone_numbers.txt',
            proxyFile: './proxies.txt',
        };
        this.cluster = null;
        this.proxies = [];
        this.currentProxyIndex = 0;
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

            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

            // Click country dropdown
            const dropdownSelector = '.dropdown-phone-codes__button';
            await page.waitForSelector(dropdownSelector, { timeout: 1800000 });
            await page.click(dropdownSelector);

            // Wait for country search input
            const countrySearchSelector = '.input__field.input-field';
            await page.waitForSelector(countrySearchSelector, { timeout: 1800000 });

            // Detect country from phone number
            const countryInfo = detectCountry(phoneNumber);
            if (!countryInfo) {
                throw new Error('Could not detect country from phone number');
            }

            // Type country code with human-like delays
            await page.type(countrySearchSelector, countryInfo.code, {
                delay: Math.random() * 100 + 50
            });

            // Wait and click the country option that matches the code
            const countryOptionSelector = `.dropdown-phone-codes__option[data-code="${countryInfo.code}"]`;
            await page.waitForSelector(countryOptionSelector, { timeout: 1800000 });
            await page.click(countryOptionSelector);

            // Type the remaining phone number
            const phoneInputSelector = 'input[type="tel"]';
            await page.waitForSelector(phoneInputSelector, { timeout: 1800000 });
            await page.focus(phoneInputSelector);
            
            // Type remaining number with random delays
            for (const digit of countryInfo.remainingNumber) {
                await page.keyboard.type(digit, { delay: Math.random() * 200 + 100 });
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            }

            // Click submit button with human-like movement
            const buttonSelector = 'button.ui-button.registration-field-phone-with-country-actions';
            const button = await page.$(buttonSelector);
            const box = await button.boundingBox();
            
            await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 5 });
            await page.click(buttonSelector);

            // Wait for success message
            const successSelector = '.ui-status-icon.ui-popup__icon.ui-status-icon--status-success.ui-status-icon--size-l';
            await page.waitForSelector(successSelector, { visible: true, timeout: 5000 });
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
            args: this.proxies.length > 0 ? [`--proxy-server=http://${this.getNextProxy()}`] : [],
            puppeteerOptions: {
                executablePath: this.getChromePath(),
                headless: isVPS ? 'new' : false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    // '--disable-dev-shm-usage',
                    // '--disable-gpu',
                    // '--no-zygote',
                    // '--single-process',
                    // '--disable-features=IsolateOrigins,site-per-process',
                    // ...(isVPS ? [
                    //     '--disable-software-rasterizer',
                    //     '--disable-extensions',
                    //     '--window-size=1920,1080'
                    // ] : []),
                ],
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
        
                // Increase timeout and add retry logic for navigation
                let maxRetries = 3;
                while (maxRetries > 0) {
                    try {
                        await page.goto('https://1xlite-506423.top/en/registration', {
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