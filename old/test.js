const { Cluster } = require('puppeteer-cluster');
require('dotenv').config();
const puppeteer = process.env.NODE_ENV === 'development' ? require('puppeteer') : require('puppeteer-core');
const fs = require('fs').promises;
const readline = require('readline');
const path = require('path');
const { Solver } = require('2captcha-ts');

class OTPSender {
    constructor() {
        this.config = {
            phoneNumbersFile: './phone_numbers.txt',
            proxyFile: './proxies.txt',
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
            // Use a more stealth approach to override properties
            await page.evaluateOnNewDocument(() => {
                // Create a proxy to intercept property access
                const proxyHandler = {
                    get: function(target, prop) {
                        switch(prop) {
                            case 'webdriver':
                                return undefined;
                            case 'languages':
                                return ['en-US', 'en'];
                            case 'plugins':
                                return [
                                    {
                                        name: 'Chrome PDF Plugin',
                                        filename: 'internal-pdf-viewer',
                                        description: 'Portable Document Format'
                                    }
                                ];
                            default:
                                return target[prop];
                        }
                    }
                };

                // Apply the proxy to navigator
                window.navigator = new Proxy(navigator, proxyHandler);

                // Override specific WebGL parameters without redefining properties
                const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(parameter) {
                    const gl = this;
                    if (parameter === 37445) {
                        return 'Intel Inc.';
                    }
                    if (parameter === 37446) {
                        return 'Intel Iris OpenGL Engine';
                    }
                    return originalGetParameter.call(gl, parameter);
                };

                // Add subtle randomization to canvas
                const getContext = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function() {
                    const context = getContext.apply(this, arguments);
                    if (context && arguments[0] === '2d') {
                        const originalGetImageData = context.getImageData;
                        context.getImageData = function() {
                            const imageData = originalGetImageData.apply(this, arguments);
                            for(let i = 0; i < imageData.data.length; i += 4) {
                                imageData.data[i] += Math.random() * 0.01;
                            }
                            return imageData;
                        };
                    }
                    return context;
                };
            });

            // Add random viewport size
            await page.setViewport({
                width: 1366 + Math.floor(Math.random() * 100),
                height: 768 + Math.floor(Math.random() * 100),
                deviceScaleFactor: 1,
                hasTouch: false,
                isLandscape: true,
                isMobile: false
            });

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
                timeout: 1800000 
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
                page.waitForSelector('.ui-status-icon--status-success', { timeout: 1800000 }),
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
        this.cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            maxConcurrency: concurrentBrowsers,
            retryLimit: 3,
            retryDelay: 3000,
            timeout: 180000, // Increase timeout to 3 minutes
            puppeteerOptions: {
                headless: process.env.HEADLESS === 'true' ? 'new' : false,
                executablePath: process.env.CHROME_PATH_WIN,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-automation',
                    '--window-size=1366,768',
                    '--disable-features=site-per-process',
                    '--disable-web-security',
                ],
                ignoreDefaultArgs: ['--enable-automation'],
                defaultViewport: null
            },
            monitor: true
        });

        await this.cluster.task(async ({ page, data: phoneNumber }) => {
            try {
                // Set up page error handling
                page.on('error', err => console.error('Page error:', err));
                page.on('pageerror', err => console.error('Page error:', err));

                // Set default navigation timeout
                page.setDefaultNavigationTimeout(60000);

                // Add anti-detection measures
                await page.evaluateOnNewDocument(() => {
                    Object.defineProperty(navigator, 'webdriver', { get: () => false });
                    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                });

                // Wait before navigation
                await new Promise(r => setTimeout(r, 2000));

                // Navigate with retry mechanism
                let retries = 3;
                while (retries > 0) {
                    try {
                        await page.goto('https://1xlite-506423.top/en/registration?type=phone&bonus=SPORT', {
                            waitUntil: 'networkidle2',
                            timeout: 30000
                        });
                        break;
                    } catch (error) {
                        console.log(`Navigation failed, retries left: ${retries}`);
                        retries--;
                        if (retries === 0) throw error;
                        await new Promise(r => setTimeout(r, 5000));
                    }
                }

                // Wait for page to be fully loaded
                await page.waitForSelector('body', { timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000));

                // Ensure the page is in a good state before proceeding
                const isPageReady = await page.evaluate(() => {
                    return document.readyState === 'complete';
                });

                if (!isPageReady) {
                    throw new Error('Page did not load completely');
                }

                // Now proceed with human behavior simulation
                await this.simulateHumanBehavior(page, phoneNumber);

            } catch (error) {
                console.error(`Task failed for ${phoneNumber}:`, error);
                // Take screenshot on error
                await page.screenshot({
                    path: `error-${Date.now()}.png`,
                    fullPage: true
                });
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

    async processPhoneNumbers(phoneNumbers) {
        try {
            // Queue all phone numbers with individual error handling
            const results = await Promise.allSettled(
                phoneNumbers.map(phoneNumber => 
                    this.cluster.execute(phoneNumber)
                        .catch(error => {
                            console.error(`Failed to process ${phoneNumber}:`, error);
                            return null;
                        })
                )
            );
            
            // Log results
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    console.log(`Successfully processed ${phoneNumbers[index]}`);
                } else {
                    console.error(`Failed to process ${phoneNumbers[index]}: ${result.reason}`);
                }
            });

            await this.cluster.idle();
            await this.cluster.close();
            
        } catch (error) {
            console.error('Error in batch processing:', error);
            await this.cluster.close();
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