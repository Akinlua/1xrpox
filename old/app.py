from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from twocaptcha import TwoCaptcha
import random
import time
import os
from dotenv import load_dotenv
import json
from concurrent.futures import ThreadPoolExecutor
import platform

class OTPSender:
    def __init__(self):
        self.config = {
            'phone_numbers_file': './phone_numbers.txt',
            'proxy_file': './proxies.txt'
        }
        self.proxies = []
        self.current_proxy_index = 0
        self.solver = TwoCaptcha('b2f661fd6f5a3a94d05900a8439c65bd')

    def get_chrome_path(self):
        if os.getenv('NODE_ENV') == 'development':
            return None
        
        system = platform.system().lower()
        if system == 'darwin':  # MacOS
            return os.getenv('CHROME_PATH_MAC')
        elif system == 'windows':
            return os.getenv('CHROME_PATH_WIN')
        else:  # Linux and others
            return os.getenv('CHROME_PATH_LINUX')

    def get_browser_options(self, proxy=None):
        options = Options()
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-setuid-sandbox')
        
        if os.getenv('NODE_ENV') == 'production':
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
        
        if proxy:
            options.add_argument(f'--proxy-server={proxy}')

        # Add anti-detection arguments
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option('excludeSwitches', ['enable-automation'])
        options.add_experimental_option('useAutomationExtension', False)

        # Add custom preferences
        prefs = {
            'profile.default_content_setting_values.notifications': 2,
            'credentials_enable_service': False,
            'profile.password_manager_enabled': False
        }
        options.add_experimental_option('prefs', prefs)

        return options

    def inject_anti_detection_js(self, driver):
        # Inject all the anti-detection JavaScript
        js_script = """
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
            languages: { get: () => ['en-US', 'en'] },
            vendor: { value: 'Google Inc.' }
        });

        // Add realistic screen properties
        Object.defineProperties(screen, {
            colorDepth: { value: 24 },
            pixelDepth: { value: 24 }
        });

        // Override canvas fingerprinting
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type) {
            const context = originalGetContext.apply(this, arguments);
            if (type === '2d') {
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
        """
        driver.execute_script(js_script)

    def random_delay(self, min_delay, max_delay):
        time.sleep(random.uniform(min_delay/1000, max_delay/1000))

    def natural_mouse_move(self, driver, element):
        action = ActionChains(driver)
        box = element.rect
        
        offset_x = random.random() * (box['width'] / 2)
        offset_y = random.random() * (box['height'] / 2)
        
        # Create natural mouse movement with multiple points
        points = [(random.random() * 100, random.random() * 100) for _ in range(3)]
        for point in points:
            action.move_by_offset(point[0], point[1])
            self.random_delay(10, 25)
        
        action.move_to_element_with_offset(element, offset_x, offset_y)
        action.perform()

    def human_type(self, element, text):
        for char in text:
            element.send_keys(char)
            self.random_delay(30, 100)
            
            # Occasional longer pauses
            if random.random() < 0.1:
                self.random_delay(100, 300)
            
            # Occasional typo and correction
            if random.random() < 0.05:
                element.send_keys(Keys.BACKSPACE)
                self.random_delay(200, 400)
                element.send_keys(char)

    def simulate_human_behavior(self, driver, phone_number):
        try:
            # Reference to original detectCountry function
            country_info = self.detect_country(phone_number)
            if not country_info:
                raise Exception('Could not detect country from phone number')

            # Wait for dropdown and click
            dropdown = WebDriverWait(driver, 30).until(
                EC.element_to_be_clickable((By.CLASS_NAME, 'dropdown-phone-codes__button'))
            )
            self.natural_mouse_move(driver, dropdown)
            self.random_delay(200, 400)
            dropdown.click()

            # Type country code
            search_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, 'input__field.input-field'))
            )
            self.human_type(search_input, country_info['code'])

            # Type phone number
            phone_input = driver.find_element(By.CSS_SELECTOR, 'input[type="tel"]')
            self.human_type(phone_input, country_info['remaining_number'])

            # Random scroll
            if random.random() > 0.7:
                driver.execute_script(f"window.scrollBy(0, {random.random() * 100});")
                self.random_delay(300, 600)

            # Click submit button
            button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, 'button.ui-button.registration-field-phone-with-country-actions'))
            )
            self.natural_mouse_move(driver, button)
            self.random_delay(200, 400)
            button.click()

            # Handle captcha if present
            try:
                WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CLASS_NAME, 'pain-puzzle'))
                )
                solved = self.solve_captcha_puzzle(driver, 3)
                if not solved:
                    raise Exception('Failed to solve captcha after maximum attempts')
            except:
                pass  # No captcha found

            print(f"✓ OTP sent successfully to {phone_number}")

        except Exception as e:
            print(f"Failed to process {phone_number}: {str(e)}")
            driver.save_screenshot(f'error-{time.time()}.png')
            raise e

    def detect_country(self, number):
        # Remove any non-digit characters
        clean_number = ''.join(filter(str.isdigit, number))
        
        # Country codes mapping
        country_patterns = {
            '1': '1',      # USA/Canada
            '44': '44',    # UK
            '81': '81',    # Japan
            '86': '86',    # China
            '91': '91',    # India
            '7': '7',      # Russia
            '49': '49',    # Germany
            '33': '33',    # France
            '39': '39',    # Italy
            '34': '34',    # Spain
            '55': '55',    # Brazil
            '52': '52',    # Mexico
            '82': '82',    # South Korea
            '84': '84',    # Vietnam
            '66': '66',    # Thailand
            '63': '63',    # Philippines
            '62': '62',    # Indonesia
            '60': '60',    # Malaysia
            '65': '65',    # Singapore
            '234': '234',  # Nigeria
            '27': '27',    # South Africa
            '20': '20',    # Egypt
            '254': '254',  # Kenya
            '255': '255',  # Tanzania
            '256': '256',  # Uganda
            '251': '251',  # Ethiopia
            '233': '233',  # Ghana
            '225': '225',  # Ivory Coast
            '228': '228',  # Togo
            '221': '221',  # Senegal
        }

        # Try to match country code
        for code in sorted(country_patterns.keys(), key=len, reverse=True):
            if clean_number.startswith(code):
                return {
                    'code': code,
                    'remaining_number': clean_number[len(code):]
                }
        return None

    def solve_captcha_puzzle(self, driver, max_attempts):
        for attempt in range(1, max_attempts + 1):
            try:
                print(f"Puzzle solving attempt {attempt}/{max_attempts}")
                
                # Wait for puzzle iframe to be present
                puzzle_frame = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CLASS_NAME, 'pain-puzzle'))
                )
                
                # Take screenshot of the puzzle
                puzzle_frame.screenshot(f'puzzle-{time.time()}.png')
                
                # Solve using 2captcha
                result = self.solver.coordinates(
                    'puzzle-{time.time()}.png',
                    lang='en'
                )
                
                if result and 'code' in result:
                    coordinates = result['code'].split(';')
                    
                    # Click the puzzle pieces in the correct order
                    for coord in coordinates:
                        x, y = map(int, coord.split(','))
                        ActionChains(driver).move_to_element_with_offset(
                            puzzle_frame, x, y
                        ).click().perform()
                        self.random_delay(300, 600)
                    
                    # Wait for success message
                    success = WebDriverWait(driver, 5).until(
                        EC.presence_of_element_located((By.CLASS_NAME, 'ui-status-icon--status-success'))
                    )
                    
                    if success:
                        print('Captcha solved successfully!')
                        return True
                
            except Exception as e:
                print(f"Failed puzzle attempt {attempt}:", str(e))
                driver.save_screenshot(f'error-puzzle-attempt-{attempt}-{time.time()}.png')
                
                if attempt == max_attempts:
                    raise Exception(f"Failed to solve captcha after {max_attempts} attempts")
                
                self.random_delay(2000, 4000)
        
        return False

    def load_proxies(self):
        try:
            with open(self.config['proxy_file'], 'r') as f:
                self.proxies = [
                    line.strip() for line in f 
                    if line.strip() and len(line.strip().split(':')) == 2 
                    and line.strip().split(':')[1] == '3128'
                ]
                
            if not self.proxies:
                print('No valid proxies found in file. Will proceed without proxy.')
                return False
                
            print(f"Loaded {len(self.proxies)} proxies")
            return True
            
        except Exception as e:
            print('Error loading proxies file:', str(e))
            return False

    def get_next_proxy(self):
        if not self.proxies:
            return None
            
        proxy = self.proxies[self.current_proxy_index]
        self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxies)
        return proxy

    def get_user_config(self):
        while True:
            try:
                concurrent_browsers = int(input('How many browsers to run at a time? (1-100): '))
                if 1 <= concurrent_browsers <= 100:
                    break
            except ValueError:
                print("Please enter a valid number")
                
        use_proxy = input('Use proxies? (y/n): ').lower() == 'y'
        
        return {
            'concurrent_browsers': concurrent_browsers,
            'use_proxy': use_proxy
        }

    def process_phone_number(self, phone_number):
        retries = 3
        last_error = None
        
        while retries > 0:
            driver = None
            try:
                proxy = self.get_next_proxy() if self.config.get('use_proxy') else None
                options = self.get_browser_options(proxy)
                
                driver = webdriver.Chrome(options=options)
                driver.set_window_size(1366 + random.randint(0, 100), 768 + random.randint(0, 100))
                
                # Set page load timeout
                driver.set_page_load_timeout(60)
                
                # Inject anti-detection measures
                self.inject_anti_detection_js(driver)
                
                # Navigate to the registration page
                driver.get('https://1xlite-506423.top/en/registration?type=phone&bonus=SPORT')
                
                # Execute human behavior simulation
                self.simulate_human_behavior(driver, phone_number)
                
                break  # Success, exit retry loop
                
            except Exception as e:
                last_error = e
                retries -= 1
                print(f"Error processing {phone_number}: {str(e)}")
                print(f"Retries remaining: {retries}")
                
                if driver:
                    driver.save_screenshot(f'error-{time.time()}.png')
                    
                if retries > 0:
                    time.sleep(2)
                    
            finally:
                if driver:
                    driver.quit()

        if retries == 0:
            print(f"Failed to process {phone_number} after all retries. Last error: {str(last_error)}")

    def start(self):
        try:
            # Get user configuration
            user_config = self.get_user_config()
            self.config['use_proxy'] = user_config['use_proxy']
            
            # Load proxies if needed
            if self.config['use_proxy']:
                self.load_proxies()
            
            # Read phone numbers
            with open(self.config['phone_numbers_file'], 'r') as f:
                phone_numbers = [line.strip() for line in f if line.strip()]
            
            if not phone_numbers:
                print('No phone numbers to process.')
                return
                
            print(f"Processing {len(phone_numbers)} numbers...")
            
            # Process phone numbers using ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=user_config['concurrent_browsers']) as executor:
                executor.map(self.process_phone_number, phone_numbers)
                
            print('All numbers processed.')
            
        except Exception as e:
            print('Error:', str(e))
            
if __name__ == "__main__":
    sender = OTPSender()
    sender.start() 