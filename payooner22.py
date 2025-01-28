from seleniumbase import Driver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
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
        load_dotenv()
        self.config = {
            'phone_numbers_file': self.get_resource_path('./phone_numbers.txt'),
            'proxy_file': self.get_resource_path('./proxies.txt'),
        }
        self.proxies = []
        self.current_proxy_index = 0
        self.solver = TwoCaptcha('b2f661fd6f5a3a94d05900a8439c65bd')

    def get_resource_path(self, relative_path):
        return os.path.join(os.getcwd(), relative_path)

    def detect_country(self, number):
        # Remove any non-digit characters
        clean_number = ''.join(filter(str.isdigit, number))
        
        # Country codes mapping (copied from app.js)
        country_patterns = {
            '1': '1',      # USA/Canada
            '7': '7',      # Russia/Kazakhstan
            '20': '20',    # Egypt
            '27': '27',    # South Africa
            '30': '30',    # Greece
            '31': '31',    # Netherlands
            '32': '32',    # Belgium
            '33': '33',    # France
            '34': '34',    # Spain
            '36': '36',    # Hungary
            '39': '39',    # Italy
            '40': '40',    # Romania
            '41': '41',    # Switzerland
            '43': '43',    # Austria
            '44': '44',    # UK
            '45': '45',    # Denmark
            '46': '46',    # Sweden
            '47': '47',    # Norway
            '48': '48',    # Poland
            '49': '49',    # Germany
            '51': '51',    # Peru
            '52': '52',    # Mexico
            '53': '53',    # Cuba
            '54': '54',    # Argentina
            '55': '55',    # Brazil
            '56': '56',    # Chile
            '57': '57',    # Colombia
            '58': '58',    # Venezuela
            '60': '60',    # Malaysia
            '61': '61',    # Australia
            '62': '62',    # Indonesia
            '63': '63',    # Philippines
            '64': '64',    # New Zealand
            '65': '65',    # Singapore
            '66': '66',    # Thailand
            '81': '81',    # Japan
            '82': '82',    # South Korea
            '84': '84',    # Vietnam
            '86': '86',    # China
            '90': '90',    # Turkey
            '91': '91',    # India
            '92': '92',    # Pakistan
            '93': '93',    # Afghanistan
            '94': '94',    # Sri Lanka
            '95': '95',    # Myanmar
            '98': '98',    # Iran
            '212': '212',  # Morocco
            '213': '213',  # Algeria
            '216': '216',  # Tunisia
            '218': '218',  # Libya
            '220': '220',  # Gambia
            '221': '221',  # Senegal
            '222': '222',  # Mauritania
            '223': '223',  # Mali
            '224': '224',  # Guinea
            '225': '225',  # Ivory Coast
            '226': '226',  # Burkina Faso
            '227': '227',  # Niger
            '228': '228',  # Togo
            '229': '229',  # Benin
            '230': '230',  # Mauritius
            '231': '231',  # Liberia
            '232': '232',  # Sierra Leone
            '233': '233',  # Ghana
            '234': '234',  # Nigeria
            '235': '235',  # Chad
            '236': '236',  # Central African Republic
            '237': '237',  # Cameroon
            '238': '238',  # Cape Verde
            '239': '239',  # São Tomé and Príncipe
            '240': '240',  # Equatorial Guinea
            '241': '241',  # Gabon
            '242': '242',  # Republic of the Congo
            '243': '243',  # DR Congo
            '244': '244',  # Angola
            '245': '245',  # Guinea-Bissau
            '246': '246',  # British Indian Ocean Territory
            '248': '248',  # Seychelles
            '249': '249',  # Sudan
            '250': '250',  # Rwanda
            '251': '251',  # Ethiopia
            '252': '252',  # Somalia
            '253': '253',  # Djibouti
            '254': '254',  # Kenya
            '255': '255',  # Tanzania
            '256': '256',  # Uganda
            '257': '257',  # Burundi
            '258': '258',  # Mozambique
            '260': '260',  # Zambia
            '261': '261',  # Madagascar
            '262': '262',  # Reunion
            '263': '263',  # Zimbabwe
            '264': '264',  # Namibia
            '265': '265',  # Malawi
            '266': '266',  # Lesotho
            '267': '267',  # Botswana
            '268': '268',  # Swaziland
            '269': '269',  # Comoros
            '297': '297',  # Aruba
            '298': '298',  # Faroe Islands
            '299': '299',  # Greenland
            '350': '350',  # Gibraltar
            '351': '351',  # Portugal
            '352': '352',  # Luxembourg
            '353': '353',  # Ireland
            '354': '354',  # Iceland
            '355': '355',  # Albania
            '356': '356',  # Malta
            '357': '357',  # Cyprus
            '358': '358',  # Finland
            '359': '359',  # Bulgaria
            '370': '370',  # Lithuania
            '371': '371',  # Latvia
            '372': '372',  # Estonia
            '373': '373',  # Moldova
            '374': '374',  # Armenia
            '375': '375',  # Belarus
            '376': '376',  # Andorra
            '377': '377',  # Monaco
            '378': '378',  # San Marino
            '380': '380',  # Ukraine
            '381': '381',  # Serbia
            '382': '382',  # Montenegro
            '385': '385',  # Croatia
            '386': '386',  # Slovenia
            '387': '387',  # Bosnia and Herzegovina
            '389': '389',  # Macedonia
            '420': '420',  # Czech Republic
            '421': '421',  # Slovakia
            '423': '423',  # Liechtenstein
            '500': '500',  # Falkland Islands
            '501': '501',  # Belize
            '502': '502',  # Guatemala
            '503': '503',  # El Salvador
            '504': '504',  # Honduras
            '505': '505',  # Nicaragua
            '506': '506',  # Costa Rica
            '507': '507',  # Panama
            '509': '509',  # Haiti
            '590': '590',  # Guadeloupe
            '591': '591',  # Bolivia
            '592': '592',  # Guyana
            '593': '593',  # Ecuador
            '594': '594',  # French Guiana
            '595': '595',  # Paraguay
            '596': '596',  # Martinique
            '597': '597',  # Suriname
            '598': '598',  # Uruguay
            '599': '599',  # Netherlands Antilles
            '670': '670',  # East Timor
            '672': '672',  # Norfolk Island
            '673': '673',  # Brunei
            '674': '674',  # Nauru
            '675': '675',  # Papua New Guinea
            '676': '676',  # Tonga
            '677': '677',  # Solomon Islands
            '678': '678',  # Vanuatu
            '679': '679',  # Fiji
            '680': '680',  # Palau
            '681': '681',  # Wallis and Futuna
            '682': '682',  # Cook Islands
            '683': '683',  # Niue
            '685': '685',  # Samoa
            '686': '686',  # Kiribati
            '687': '687',  # New Caledonia
            '688': '688',  # Tuvalu
            '689': '689',  # French Polynesia
            '690': '690',  # Tokelau
            '691': '691',  # Micronesia
            '692': '692',  # Marshall Islands
            '850': '850',  # North Korea
            '852': '852',  # Hong Kong
            '853': '853',  # Macau
            '855': '855',  # Cambodia
            '856': '856',  # Laos
            '880': '880',  # Bangladesh
            '886': '886',  # Taiwan
            '960': '960',  # Maldives
            '961': '961',  # Lebanon
            '962': '962',  # Jordan
            '963': '963',  # Syria
            '964': '964',  # Iraq
            '965': '965',  # Kuwait
            '966': '966',  # Saudi Arabia
            '967': '967',  # Yemen
            '968': '968',  # Oman
            '970': '970',  # Palestinian Territory
            '971': '971',  # United Arab Emirates
            '972': '972',  # Israel
            '973': '973',  # Bahrain
            '974': '974',  # Qatar
            '975': '975',  # Bhutan
            '976': '976',  # Mongolia
            '977': '977',  # Nepal
            '992': '992',  # Tajikistan
            '993': '993',  # Turkmenistan
            '994': '994',  # Azerbaijan
            '995': '995',  # Georgia
            '996': '996',  # Kyrgyzstan
            '998': '998',  # Uzbekistan
        }
        
        # Check for matches starting with longest possible code
        for i in range(3, 0, -1):
            potential_code = clean_number[:i]
            if potential_code in country_patterns:
                return {
                    'code': country_patterns[potential_code],
                    'remaining_number': clean_number[i:]
                }
        return None

    def simulate_human_behavior(self, driver, phone_number):
        try:
            # Add these at the start of your existing method
            
            # 1. Add more random delays and mouse movements
            time.sleep(random.uniform(1, 2))
            
            # 2. Add realistic headers and browser properties
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
                
                // Add realistic navigator properties
                Object.defineProperties(navigator, {
                    hardwareConcurrency: { value: 8 },
                    deviceMemory: { value: 8 },
                    platform: { value: 'Win32' },
                    maxTouchPoints: { value: 0 },
                    languages: { value: ['en-US', 'en'] },
                    vendor: { value: 'Google Inc.' }
                });
            """
            driver.execute_script(js_script)
            
            # 3. Add random scrolling behavior
            scroll_amount = random.randint(100, 300)
            driver.execute_script(f"window.scrollBy(0, {scroll_amount});")
            time.sleep(random.uniform(0.5, 1))

            wait = WebDriverWait(driver, 1000)
            
            # Type country code
            firstname = wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, '#txtFirstName')
            ))
            self.human_type(driver, firstname, "ankirifl")

            firstname = wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, '#txtLastName')
            ))
            self.human_type(driver, firstname, "wrkkrkee")

            firstname = wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, '#txtEmail')
            ))
            self.human_type(driver, firstname, "akin@gmail.com")

            firstname = wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, '#txtRetypeEmail')
            ))
            self.human_type(driver, firstname, "akin@gmail.com")

            datetext = wait.until(EC.element_to_be_clickable(
                (By.CSS_SELECTOR, '#datepicker5')
            ))
            datetext.click()
            
            # Click the year dropdown
            date = wait.until(EC.element_to_be_clickable(
                (By.CSS_SELECTOR, '.ui-datepicker-year')
            ))
            date.click()

            # Select a random year between 1980 and 1990
            random_year = str(random.randint(1980, 2005))
            year_option = wait.until(EC.element_to_be_clickable(
                (By.CSS_SELECTOR, f'.ui-datepicker-year option[value="{random_year}"]')
            ))
            year_option.click()

            # Click on the body to close/accept the date picker
            body = driver.find_element(By.TAG_NAME, 'body')
            body.click()

            # After form submission, add more human-like behavior
            time.sleep(random.uniform(1.5, 2.5))
            
            # Random mouse movements
            action = ActionChains(driver)
                        # Move relative to current position within safe bounds
            x_offset = random.randint(-50, 50)
            y_offset = random.randint(-50, 50)
            
            try:
                action.move_by_offset(x_offset, y_offset).perform()
                time.sleep(random.uniform(0.1, 0.3))
            except:
                # If movement fails, reset mouse position to center
                action.move_to_element(driver.find_element(By.TAG_NAME, "body")).perform()
                
            # Click submit button
            button = wait.until(EC.element_to_be_clickable(
                (By.CSS_SELECTOR, '#PersonalDetailsButtonArkose')
            ))
            # self.natural_mouse_move(driver, button)
            # time.sleep(random.uniform(0.2, 0.4))
            button.click()
            print("clicked button submit")



            # ///////////////////////


            # Handle potential captcha
            # try:
            #     WebDriverWait(driver, 100).until(
            #         lambda d: EC.presence_of_element_located((By.CSS_SELECTOR, '.ui-status-icon.ui-popup__icon.ui-status-icon--status-success.ui-status-icon--size-l'))(d) or 
            #                 EC.presence_of_element_located((By.CSS_SELECTOR, '.pain-puzzle'))(d)
            #     )
                
            #     if driver.find_element(By.CSS_SELECTOR, '.pain-puzzle').is_displayed():
            #         solved = self.solve_arrow_puzzle(driver, 3)
            #         if not solved:
            #             raise Exception('Failed to solve captcha after maximum attempts')
            # except:
            #     pass

            # Wait for phone number form
            wait = WebDriverWait(driver, 60)
            phone_select = wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, '#AccountPhoneNumber_iso2')
            ))

            # Click to open country code dropdown
            phone_select.click()
            time.sleep(random.uniform(0.3, 0.7))

            # Select country code (for example +234)
            country_code = self.detect_country(phone_number)
            country_option = wait.until(EC.element_to_be_clickable(
                (By.CSS_SELECTOR, f'option[value="+{country_code["code"]}"]')
            ))
            country_option.click()
            time.sleep(random.uniform(0.2, 0.5))

            # Find and fill phone number input
            phone_input = wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, 'input[name="ctl00$cphBodyContent$ContactDetails1$phoneDetails$AccountPhoneNumber"]')
            ))
            self.human_type(driver, phone_input, phone_number)  # Replace with your phone number

            # Wait for and click the send code button
            send_button = wait.until(EC.element_to_be_clickable(
                (By.CSS_SELECTOR, '#lnkSendCodeArkose')
            ))
            self.natural_mouse_move(driver, send_button)
            time.sleep(random.uniform(0.3, 0.6))
            send_button.click()

            print(f"✓ OTP sent successfully to {phone_number}")

        except Exception as e:
            print(f"Failed to process {phone_number}: {str(e)}")
            driver.save_screenshot(f'error-{time.time()}.png')
            raise e

    def get_user_config(self):
        """Get user configuration for browsers and proxy usage"""
        while True:
            try:
                browsers = int(input("Enter number of concurrent browsers (1-10): "))
                if 1 <= browsers <= 10:
                    break
                print("Please enter a number between 1 and 10")
            except ValueError:
                print("Please enter a valid number")
        
        while True:
            use_proxy = input("Do you want to use proxies? (y/n): ").lower()
            if use_proxy in ['y', 'n']:
                break
            print("Please enter 'y' or 'n'")
        
        return {
            'concurrent_browsers': browsers,
            'use_proxy': use_proxy == 'y'
        }

    def load_proxies(self):
        """Load proxies from file if they exist"""
        try:
            with open(self.config['proxy_file'], 'r') as f:
                self.proxies = [line.strip() for line in f if line.strip()]
            if self.proxies:
                print(f"Loaded {len(self.proxies)} proxies")
            else:
                print("No proxies found in file")
        except FileNotFoundError:
            print(f"Proxy file not found: {self.config['proxy_file']}")
            self.proxies = []

    def get_next_proxy(self):
        """Get next proxy in rotation"""
        if not self.proxies:
            return None
        
        proxy = self.proxies[self.current_proxy_index]
        self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxies)
        return proxy

    def process_phone_number(self, phone_number):
        retries = 3
        while retries > 0:
            driver = None
            try:
                # Get proxy if enabled
                proxy = self.get_next_proxy() if self.config.get('use_proxy') else None
                
                # Add proxy to options if available
                options = {
                    'excludeSwitches': ['enable-automation'],
                    'useAutomationExtension': False,
                    'disable-blink-features': 'AutomationControlled'
                }
                
                if proxy:
                    options['proxy'] = {
                        'httpProxy': proxy,
                        'sslProxy': proxy
                    }
                
                driver = Driver(uc=True, proxy=proxy if proxy else None)
                
                # Set viewport size
                width = random.randint(1200, 1600)
                height = random.randint(800, 1000)
                driver.set_window_size(width, height)
                
                # Add random user agent
                user_agents = [
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                ]
                driver.execute_cdp_cmd('Network.setUserAgentOverride', {
                    "userAgent": random.choice(user_agents)
                })
                
                # Navigate to registration page with retries
                max_nav_retries = 3
                while max_nav_retries > 0:
                    try:
                        print("naviagting")
                        driver.get('https://payouts.payoneer.com/partners/or.aspx?pid=YOYIZC74IO2s4KZQp7tgsw%3d%3d&BusinessLine=3&Volume=0&web_interaction=webpage_accounts&from=login&langid=1&locale=en')
                        print("navigated")
                        break
                    except Exception as e:
                        max_nav_retries -= 1
                        if max_nav_retries == 0:
                            raise e
                        print(f"Navigation failed, retrying... ({max_nav_retries} attempts left)")
                        time.sleep(5)

                # Execute human behavior simulation
                self.simulate_human_behavior(driver, phone_number)
                break

            except Exception as e:
                retries -= 1
                print(f"Error processing {phone_number}: {str(e)}")
                if retries > 0:
                    print(f"Retries remaining: {retries}")
                    time.sleep(2)
                else:
                    raise e
            finally:
                if driver:
                    driver.quit()

    def start(self):
        try:
            # Get user configuration
            user_config = self.get_user_config()
            self.config['use_proxy'] = user_config['use_proxy']
            
            # Load proxies if enabled
            if self.config['use_proxy']:
                self.load_proxies()
            
            # Read phone numbers
            with open(self.config['phone_numbers_file'], 'r') as f:
                phone_numbers = [line.strip() for line in f if line.strip()]

            if phone_numbers:
                print(f"Processing {len(phone_numbers)} numbers...")
                with ThreadPoolExecutor(max_workers=user_config['concurrent_browsers']) as executor:
                    executor.map(self.process_phone_number, phone_numbers)
                print('All numbers processed.')
            else:
                print('No numbers to process.')

        except Exception as e:
            print('Error:', str(e))
            raise e

    def natural_mouse_move(self, driver, element):
        """Simulates natural mouse movement to an element."""
        action = ActionChains(driver)
        box = element.rect
        
        # Calculate random offset within element bounds
        offset_x = random.random() * (box['width'] / 2)
        offset_y = random.random() * (box['height'] / 2)
        
        # Create natural mouse movement with multiple points
        points = [(random.random() * 100, random.random() * 100) for _ in range(3)]
        for point in points:
            action.move_by_offset(point[0], point[1])
            time.sleep(random.uniform(0.01, 0.025))  # Small delay between movements
        
        # Final move to element with offset
        action.move_to_element_with_offset(element, offset_x, offset_y)
        action.perform()

    def human_type(self, driver, element, text):
        """Simulates human-like typing behavior."""
        for char in text:
            element.send_keys(char)
            time.sleep(random.uniform(0.03, 0.1))  # Base typing delay
            
            # Occasional longer pauses
            if random.random() < 0.1:
                time.sleep(random.uniform(0.1, 0.3))
            
            # Occasional typo and correction
            if random.random() < 0.05:
                element.send_keys(Keys.BACKSPACE)
                time.sleep(random.uniform(0.2, 0.4))
                element.send_keys(char)

    def solve_arrow_puzzle(self, driver, max_attempts=3):
        attempts = 0
        
        while attempts < max_attempts:
            attempts += 1
            print(f"Arrow puzzle solving attempt {attempts}/{max_attempts}")
            
            try:
                wait = WebDriverWait(driver, 30)
                
                # Wait for the puzzle container and images
                puzzle_container = wait.until(EC.visibility_of_element_located(
                    (By.CSS_SELECTOR, '.puzzle-container')
                ))
                
                # Find arrow buttons
                left_arrow = wait.until(EC.element_to_be_clickable(
                    (By.CSS_SELECTOR, '[aria-label="Move Left"]')
                ))
                right_arrow = wait.until(EC.element_to_be_clickable(
                    (By.CSS_SELECTOR, '[aria-label="Move Right"]')
                ))
                
                # Get the pattern image for 2captcha
                pattern_image = driver.find_element(By.CSS_SELECTOR, '.pattern-image')
                pattern_base64 = pattern_image.screenshot_as_base64
                
                # Send to 2captcha
                response = self.solver.coordinates(
                    image=pattern_base64,
                    textinstructions='Match the movement pattern shown in the image'
                )
                
                if not response or not response['code']:
                    raise Exception('Failed to get solution from 2captcha')
                
                # Execute the movement pattern
                for direction in response['code']:
                    if direction == 'left':
                        self.natural_mouse_move(driver, left_arrow)
                        left_arrow.click()
                    else:
                        self.natural_mouse_move(driver, right_arrow)
                        right_arrow.click()
                    time.sleep(random.uniform(0.3, 0.6))
                
                # Click submit
                submit_button = wait.until(EC.element_to_be_clickable(
                    (By.CSS_SELECTOR, '.Submit')
                ))
                submit_button.click()
                
                # Check for success
                try:
                    success = wait.until(EC.presence_of_element_located(
                        (By.CSS_SELECTOR, '.success-message')
                    ))
                    return True
                except:
                    continue
                
            except Exception as e:
                print(f"Failed arrow puzzle attempt {attempts}:", str(e))
                if attempts == max_attempts:
                    raise Exception(f'Failed to solve arrow puzzle after {max_attempts} attempts')
                time.sleep(random.uniform(2, 4))
        
        return False

if __name__ == "__main__":
    sender = OTPSender()
    sender.start()