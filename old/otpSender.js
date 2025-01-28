require('dotenv').config();
const puppeteer = process.env.NODE_ENV === 'development' ? require('puppeteer') : require('puppeteer-core');
const fs = require('fs').promises;
const readline = require('readline');
const path = require('path');

class OTPSender {
    constructor(config) {
        this.config = {
            phoneNumbersFile: process.env.PHONE_NUMBERS_FILE || './phone_numbers.txt',
            proxyFile: process.env.PROXY_FILE || './proxies.txt',
            maxBrowsers: parseInt(process.env.MAX_BROWSERS) || 1,
            useProxy: process.env.USE_PROXY === 'true',
            ...config
        };
        this.activeBrowsers = 0;
        this.proxies = [];
    }

    getChromePath() {
        if (process.env.NODE_ENV === 'development') {
            return undefined; // Let puppeteer handle it in development
        }
        
        return process.platform === 'win32' 
            ? process.env.CHROME_PATH_WIN 
            : process.env.CHROME_PATH_LINUX;
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

    async loadProxies() {
        try {
            const proxyContent = await fs.readFile(this.config.proxyFile, 'utf8');
            this.proxies = proxyContent
                .split('\n')
                .map(line => line.trim())
                .filter(line => {
                    // Filter out empty lines and validate IP:PORT format
                    const parts = line.split(':');
                    return parts.length === 2 && parts[1].trim() === '3128';
                })
                .map(proxy => `http://${proxy}`); // Add http:// prefix

            if (this.proxies.length === 0) {
                console.log('No valid proxies found in file. Will proceed without proxy.');
                this.config.useProxy = false;
            } else {
                console.log(`Loaded ${this.proxies.length} proxies`);
            }
        } catch (error) {
            console.warn('Error loading proxies file:', error);
            this.config.useProxy = false;
        }
    }

    getRandomProxy() {
        if (!this.proxies.length) return null;
        return this.proxies[Math.floor(Math.random() * this.proxies.length)];
    }

    async processPhoneNumber(phoneNumber) {
        let retries = 3;
        let lastError = null;

        while (retries > 0) {
            // Only use proxy if enabled and proxies are available
            const proxy = this.config.useProxy ? this.getRandomProxy() : null;
            const browserOptions = {
                headless: process.env.HEADLESS === 'true' ? 'new' : false,
                executablePath: this.getChromePath(),
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    ...(proxy ? [`--proxy-server=${proxy}`] : [])
                ]
            };

            try {
                const statusMessage = proxy 
                    ? `Processing ${phoneNumber} with proxy: ${proxy}`
                    : `Processing ${phoneNumber} without proxy`;
                console.log(statusMessage);
                
                const browser = await puppeteer.launch(browserOptions);
                const page = await browser.newPage();

                // Set timeout and user agent
                page.setDefaultNavigationTimeout(30000);
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

                await page.goto('https://1xlite-506423.top/en/registration', {
                    waitUntil: 'networkidle0',
                    timeout: 100000
                });

                // Wait for phone input and type
                await page.waitForSelector('input[type="tel"]', { timeout: 100000 });
                await page.type('input[type="tel"]', phoneNumber);
                
                // Updated selector with exact class name
                const buttonSelector = 'button.ui-button.registration-field-phone-with-country-actions.ui-button--size-m.ui-button--theme-primary.ui-button--narrow.ui-button--rounded.registration-field-phone-with-country__send';
                
                // Wait for button to be visible and clickable
                await page.waitForSelector(buttonSelector, { visible: true, timeout: 100000 });
                
                // Click the button
                await page.click(buttonSelector);

                console.log(`✓ OTP sent to ${phoneNumber}`);
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                // await browser.close();
                break; // Success, exit retry loop

            } catch (error) {
                lastError = error;
                console.error(`Attempt failed: ${error.message}`);
                retries--;

                if (retries > 0) {
                    console.log(`Retrying... ${retries} attempts remaining`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } finally {
                this.activeBrowsers--;
            }
        }

        if (retries === 0) {
            console.error(`Failed to process ${phoneNumber} after all retries. Last error: ${lastError?.message}`);
        }
    }

    async start() {
        console.log(`Starting in ${process.env.NODE_ENV} mode`);
        
        if (this.config.useProxy) {
            await this.loadProxies();
        }
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        while (true) {
            try {
                const phoneNumbers = await fs.readFile(this.config.phoneNumbersFile, 'utf8');
                const numbers = phoneNumbers.split('\n').filter(num => num.trim());

                if (numbers.length > 0) {
                    console.log(`Found ${numbers.length} numbers to process`);
                }

                for (const number of numbers) {
                    while (this.activeBrowsers >= this.config.maxBrowsers) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    this.activeBrowsers++;
                    this.processPhoneNumber(number.trim());
                }

                if (numbers.length > 0) {
                    await fs.writeFile(this.config.phoneNumbersFile, '');
                }

                const answer = await new Promise(resolve => {
                    rl.question('Continue monitoring for new numbers? (y/n): ', resolve);
                });

                if (answer.toLowerCase() !== 'y') break;

            } catch (error) {
                console.error('Error reading phone numbers:', error);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        rl.close();
    }
}

// Usage
const sender = new OTPSender();
sender.start(); 