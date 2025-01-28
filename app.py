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
            wait = WebDriverWait(driver, 1000)
            
            # Inject anti-detection JavaScript
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

            # Initial random delay
            initial_delay = random.uniform(1000, 1500) / 1000
            time.sleep(initial_delay)

            # Simulate mouse movement
            action = ActionChains(driver)
            action.move_by_offset(
                200 + random.random() * 100,
                150 + random.random() * 50
            ).perform()

            # Click country dropdown
            dropdown = wait.until(EC.element_to_be_clickable(
                (By.CSS_SELECTOR, '.dropdown-phone-codes__button')
            ))
            self.natural_mouse_move(driver, dropdown)
            time.sleep(random.uniform(0.2, 0.4))
            dropdown.click()

            # Detect country from phone number
            country_info = self.detect_country(phone_number)
            if not country_info:
                raise Exception('Could not detect country from phone number')

            # Type country code
            search_input = wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, '.input__field.input-field')
            ))
            self.human_type(driver, search_input, country_info['code'])

            # Simulate human pause between inputs
            time.sleep(random.uniform(0.5, 1.0))

            # Type phone number
            phone_input = wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, 'input[type="tel"]')
            ))
            self.human_type(driver, phone_input, country_info['remaining_number'])

            # Random scroll behavior
            if random.random() > 0.7:
                driver.execute_script(f"window.scrollBy(0, {random.random() * 100});")
                time.sleep(random.uniform(0.3, 0.6))

            # Click submit button
            button = wait.until(EC.element_to_be_clickable(
                (By.CSS_SELECTOR, 'button.ui-button.registration-field-phone-with-country-actions')
            ))
            self.natural_mouse_move(driver, button)
            time.sleep(random.uniform(0.2, 0.4))
            button.click()

            # Handle potential captcha
            try:
                WebDriverWait(driver, 100).until(
                    lambda d: EC.presence_of_element_located((By.CSS_SELECTOR, '.ui-status-icon.ui-popup__icon.ui-status-icon--status-success.ui-status-icon--size-l'))(d) or 
                            EC.presence_of_element_located((By.CSS_SELECTOR, '.pain-puzzle'))(d)
                )
                
                if driver.find_element(By.CSS_SELECTOR, '.pain-puzzle').is_displayed():
                    solved = self.solve_captcha_puzzle(driver, 3)
                    if not solved:
                        raise Exception('Failed to solve captcha after maximum attempts')
            except:
                pass

            print(f"✓ OTP sent successfully to {phone_number}")

        except Exception as e:
            print(f"Failed to process {phone_number}: {str(e)}")
            driver.save_screenshot(f'error-{time.time()}.png')
            raise e

    def process_phone_number(self, phone_number):
        retries = 3
        while retries > 0:
            driver = None
            try:
                driver = Driver(uc=True)
                
                # Set viewport size
                driver.set_window_size(
                    1366 + random.randint(0, 100),
                    768 + random.randint(0, 100)
                )
                
                # Navigate to registration page with retries
                max_nav_retries = 3
                while max_nav_retries > 0:
                    try:
                        print("naviagting")
                        driver.get('https://1xlite-506423.top/en/registration?type=phone&bonus=SPORT')
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
            # Read phone numbers
            with open(self.config['phone_numbers_file'], 'r') as f:
                phone_numbers = [line.strip() for line in f if line.strip()]

            if phone_numbers:
                print(f"Processing {len(phone_numbers)} numbers...")
                with ThreadPoolExecutor(max_workers=1) as executor:
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

    def solve_captcha_puzzle(self, driver, max_attempts=3):
        attempts = 0
        
        while attempts < max_attempts:
            attempts += 1
            print(f"Puzzle solving attempt {attempts}/{max_attempts}")
            
            try:
                # Wait for the puzzle container
                wait = WebDriverWait(driver, 30)
                wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, '.pain-puzzle')))

                # Wait for both images to be present and loaded
                order_image = wait.until(EC.visibility_of_element_located(
                    (By.CSS_SELECTOR, '.pain-puzzle__order-image')
                ))
                puzzle_image = wait.until(EC.visibility_of_element_located(
                    (By.CSS_SELECTOR, '.pain-puzzle__task-image')
                ))

                # Get the puzzle container position
                puzzle_container = driver.find_element(By.CSS_SELECTOR, '.pain-puzzle__task-image-container')
                container_location = puzzle_container.location
                
                # Get base64 images
                order_image_base64 = order_image.get_attribute('src')
                puzzle_image_base64 = puzzle_image.get_attribute('src')

                # Send to 2captcha
                response = self.solver.coordinates(
                    image=puzzle_image_base64,
                    imginstructions=order_image_base64,
                    textinstructions='Click in this order'
                )
                
                if not response or not response['code']:
                    raise Exception('Failed to get solution from 2captcha')
                
                coordinates = response['code']

                # Click the coordinates in order
                action = ActionChains(driver)
                for coordinate in coordinates:
                    absolute_x = container_location['x'] + float(coordinate['x'])
                    absolute_y = container_location['y'] + float(coordinate['y'])

                    # Move mouse naturally
                    self.natural_mouse_move(driver, 
                        {'x': absolute_x, 'y': absolute_y, 'width': 1, 'height': 1}
                    )
                    
                    time.sleep(random.uniform(0.2, 0.5))
                    action.click().perform()
                    time.sleep(random.uniform(0.3, 0.8))

                # Click send button
                send_button = wait.until(EC.element_to_be_clickable(
                    (By.CSS_SELECTOR, '.pain-puzzle__button.pain-puzzle__button--send')
                ))
                self.natural_mouse_move(driver, send_button)
                time.sleep(random.uniform(0.3, 0.6))
                send_button.click()

                try:
                    # Wait for success message
                    success_selector = '.ui-status-icon.ui-popup__icon.ui-status-icon--status-success.ui-status-icon--size-l'
                    WebDriverWait(driver, 1800).until(
                        EC.visibility_of_element_located((By.CSS_SELECTOR, success_selector))
                    )
                    print('Captcha solved successfully!')
                    return True
                except:
                    # Check if new puzzle appeared
                    new_puzzle = driver.find_elements(By.CSS_SELECTOR, '.pain-puzzle')
                    if new_puzzle and new_puzzle[0].is_displayed():
                        print('New puzzle generated, retrying...')
                        time.sleep(random.uniform(1, 2))
                        continue
                    else:
                        # Double check for success message
                        success_message = driver.find_elements(By.CSS_SELECTOR, success_selector)
                        if success_message and success_message[0].is_displayed():
                            print('Captcha solved successfully!')
                            return True

            except Exception as e:
                print(f"Failed puzzle attempt {attempts}:", str(e))
                driver.save_screenshot(f'error-puzzle-attempt-{attempts}-{time.time()}.png')
                
                if attempts == max_attempts:
                    raise Exception(f'Failed to solve captcha after {max_attempts} attempts')
                
                time.sleep(random.uniform(2, 4))
        
        return False

if __name__ == "__main__":
    sender = OTPSender()
    sender.start()