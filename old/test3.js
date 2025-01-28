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

    async simulateHumanBehavior(page, phoneNumber) {
        try {
            // Random initial delay before starting
            await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    
            // Move mouse randomly before clicking input
            await page.mouse.move(
                100 + Math.random() * 100,
                100 + Math.random() * 100,
                { steps: 5 }
            );
    
            // Wait for phone input and focus it
            const inputSelector = 'input[type="tel"]';
            await page.waitForSelector(inputSelector, { timeout: 30000 });
            await page.focus(inputSelector);
            
            // Type phone number with random delays between each digit
            const formattedNumber = phoneNumber.replace(/\s+/g, '').replace(/\D/g, '');
            for (const digit of formattedNumber) {
                await page.keyboard.type(digit, { delay: Math.random() * 200 + 100 });
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            }
    
            // Move mouse to button area with natural movement
            const buttonSelector = 'button.ui-button.registration-field-phone-with-country-actions.ui-button--size-m.ui-button--theme-primary.ui-button--narrow.ui-button--rounded.registration-field-phone-with-country__send';
            const button = await page.$(buttonSelector);
            const box = await button.boundingBox();
            
            // Random position within button
            const x = box.x + box.width * Math.random();
            const y = box.y + box.height * Math.random();
            
            // Move to button in steps
            await page.mouse.move(x, y, { steps: 25 });
            
            // Small delay before clicking
            await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
            
            // Click the button
            await page.mouse.click(x, y);
    
            // Wait for success message
            const successSelector = '.ui-status-icon.ui-popup__icon.ui-status-icon--status-success.ui-status-icon--size-l';
            await page.waitForSelector(successSelector, { 
                visible: true, 
                timeout: 10000 
            });
    
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
        this.cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            maxConcurrency: concurrentBrowsers,
            monitor: false,
            skipDuplicates: false,
            // args: this.proxies.length > 0 ? [`--proxy-server=http://156.228.183.222:3128`] : [],
            puppeteerOptions: {
                executablePath: this.getChromePath(),
                headless: false,
                args: [ '--proxy-server=104.167.25.249:3128','--no-sandbox', '--disable-setuid-sandbox' ],

                // ar: ['--no-sandbox', '--disable-setuid-sandbox']
            },
            retryLimit: 2,
            retryDelay: 1000
        });

        // await this.cluster.task(async ({ page, data: phoneNumber }) => {
            
        //     try {
        //         // const formattedNumber = phoneNumber.replace(/\s+/g, '').replace(/\D/g, '');
        //         const formattedNumber = phoneNumber;
        //         await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                
        //         // Log the request with proxy information
        //         page.on('request', request => {
        //             // console.log(`Request to ${request.url()} with proxy: ${proxy || 'No proxy'}`);
        //         });

        //         try {
        //             await page.goto('https://1xlite-506423.top/en/registration', {
        //                 waitUntil: 'networkidle0',
        //                 timeout: 30000
        //             });
        //         } catch (error) {
        //             throw new Error(`Navigation failed: ${error.message} (Proxy: ${rawProxy || 'No proxy'})`);
        //         }

              
        //         try {
        //             await page.waitForSelector('input[type="tel"]', { timeout: 30000 });
        //             await page.type('input[type="tel"]', formattedNumber);
        //         } catch (error) {
        //             throw new Error(`Phone input failed: ${error.message}`);
        //         }

        //         // Wait for and click button
        //         try {
        //             const buttonSelector = 'button.ui-button.registration-field-phone-with-country-actions.ui-button--size-m.ui-button--theme-primary.ui-button--narrow.ui-button--rounded.registration-field-phone-with-country__send';
        //             await page.waitForSelector(buttonSelector, { visible: true, timeout: 30000 });
        //             await page.click(buttonSelector);
        //         } catch (error) {
        //             throw new Error(`Button click failed: ${error.message}`);
        //         }

        //         // Verify OTP was sent (look for success message or element)
        //         try {
        //             const successSelector = '.ui-status-icon.ui-popup__icon.ui-status-icon--status-success.ui-status-icon--size-l';
        //             await page.waitForSelector(successSelector, { 
        //                 visible: true, 
        //                 timeout: 5000 
        //             });
        //             console.log(`✓ OTP sent successfully to ${phoneNumber}`);
        //         } catch (error) {
        //             await new Promise(resolve => setTimeout(resolve, 2000));
        //             throw new Error('Could not verify OTP was sent');
        //         }

        //         // Wait before closing
        //         await new Promise(resolve => setTimeout(resolve, 2000));

        //     } catch (error) {
        //         console.error(`Failed processing ${phoneNumber} with proxy: ${rawProxy || 'No proxy'}`);
        //         console.error(`Error: ${error.message}`);
                
        //         if (error.message.includes('Navigation failed')) {
        //             console.log(`Will retry with different proxy (Current: ${rawProxy || 'No proxy'})...`);
        //             throw error;
        //         }

        //         throw error;
        //     } finally {
        //         try {
        //             await page.close();
        //         } catch (e) {
        //             console.error('Error closing page:', e);
        //         }
        //     }
        // });

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
        
                await page.goto('https://whatsmyip.com/', {
                    waitUntil: 'networkidle0',
                    timeout: 30000
                });

                await page.screenshot({ path: 'screenshot.png' });
        
                // Execute human-like behavior
                // await this.simulateHumanBehavior(page, phoneNumber);
                
                // Keep browser open for verification
                await new Promise(resolve => setTimeout(resolve, 2000));
        
            } catch (error) {
                console.error(`Failed processing ${phoneNumber} with proxy: ${proxy || 'No proxy'}`);
                console.error(`Error: ${error.message}`);
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

            // while (true) {
            //     const phoneNumbers = await fs.readFile(this.config.phoneNumbersFile, 'utf8');
            //     const numbers = phoneNumbers.split('\n')
            //         .filter(num => num.trim())
            //         .map(num => num.trim());

            //     if (numbers.length > 0) {
            //         console.log(`Processing ${numbers.length} numbers...`);
                    
            //         // Queue all numbers for processing
            //         await Promise.all(numbers.map(number => 
            //             this.cluster.queue(number)
            //         ));
            //     }

            //     const rl = readline.createInterface({
            //         input: process.stdin,
            //         output: process.stdout
            //     });

            //     const answer = await new Promise(resolve => {
            //         rl.question('Continue processing numbers? (y/n): ', resolve);
            //     });

            //     rl.close();

            //     if (answer.toLowerCase() !== 'y') {
            //         console.log('Stopping the script...');
            //         await this.cluster.close();
            //         break;
            //     }

            //     await new Promise(resolve => setTimeout(resolve, 5000));
            // }

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