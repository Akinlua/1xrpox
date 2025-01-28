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

///

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
                page.waitForSelector('.ui-status-icon--status-success', { timeout: 10000 }),
                page.waitForSelector('.pain-puzzle', { timeout: 10000 })
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
                        await page.goto('https://1xlite-506423.top/en/registration?type=phone&bonus=SPORT', {
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
                        timeout: 10000 
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