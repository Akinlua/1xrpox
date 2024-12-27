from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import random
import time
import os
from concurrent.futures import ThreadPoolExecutor

class OTPSender:
    def __init__(self):
        self.config = {
            'phone_numbers_file': './phone_numbers.txt',
            'use_proxy': False
        }

    def simulate_human_behavior(self, driver, phone_number):
        try:
            # Initial delay for page stability
            time.sleep(3)  # Increased initial wait

            # Function to wait for element with retry
            def wait_for_element(selector, by_type=By.CSS_SELECTOR, timeout=60, is_clickable=True):
                start_time = time.time()
                while time.time() - start_time < timeout:
                    try:
                        if is_clickable:
                            element = WebDriverWait(driver, 10).until(
                                EC.element_to_be_clickable((by_type, selector))
                            )
                        else:
                            element = WebDriverWait(driver, 10).until(
                                EC.presence_of_element_located((by_type, selector))
                            )
                        return element
                    except Exception:
                        print(f"Retrying to find element: {selector}")
                        time.sleep(2)
                raise Exception(f"Element not found after {timeout} seconds: {selector}")

            # Click country dropdown with retry
            dropdown_selector = '.dropdown-phone-codes__button'
            dropdown = wait_for_element(dropdown_selector)
            driver.execute_script("arguments[0].scrollIntoView(true);", dropdown)
            time.sleep(1)
            dropdown.click()

            # Type phone number
            phone_input = WebDriverWait(driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='tel']"))
            )
            for digit in phone_number:
                phone_input.send_keys(digit)
                time.sleep(random.uniform(0.1, 0.3))

            # Click submit button
            button_selector = "button.ui-button.registration-field-phone-with-country-actions.ui-button--size-m.ui-button--theme-primary.ui-button--narrow.ui-button--rounded.registration-field-phone-with-country__send"
            button = WebDriverWait(driver, 30).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, button_selector))
            )
            
            action = ActionChains(driver)
            action.move_to_element(button).pause(random.uniform(0.2, 0.5)).click().perform()

            # Wait for success message
            success_selector = ".ui-status-icon.ui-popup__icon.ui-status-icon--status-success.ui-status-icon--size-l"
            WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, success_selector))
            )
            print(f"✓ OTP sent successfully to {phone_number}")

        except Exception as e:
            print(f"Failed to process {phone_number}: {str(e)}")
            timestamp = time.strftime("%Y%m%d-%H%M%S")
            try:
                driver.save_screenshot(f"error-{timestamp}.png")
            except:
                print("Could not save screenshot")
            raise e

    def setup_driver(self):
        options = Options()
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-setuid-sandbox')
        options.add_argument('--start-maximized')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option('excludeSwitches', ['enable-automation'])
        options.add_experimental_option('useAutomationExtension', False)
        
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        driver.set_window_size(1920, 1080)
        
        driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
            'source': '''
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                })
            '''
        })
        return driver

    def process_number(self, number):
        driver = self.setup_driver()
        try:
            driver.get('https://1xlite-506423.top/en/registration')
            self.simulate_human_behavior(driver, number)
        except Exception as e:
            print(f"Error processing {number}: {str(e)}")
        finally:
            driver.quit()

    def process_numbers(self, concurrent_browsers):
        try:
            with open(self.config['phone_numbers_file'], 'r') as f:
                numbers = [line.strip() for line in f if line.strip()]

            if not numbers:
                print("No numbers to process.")
                return

            print(f"Processing {len(numbers)} numbers...")
            
            for number in numbers:
                max_retries = 3
                retry_count = 0
                
                while retry_count < max_retries:
                    driver = None
                    try:
                        driver = self.setup_driver()
                        # Increase page load timeout
                        driver.set_page_load_timeout(180)  # 3 minutes timeout
                        
                        # Retry page load if it fails
                        load_success = False
                        for attempt in range(3):
                            try:
                                print(f"Attempting to load page (attempt {attempt + 1}/3)")
                                driver.get('https://1xlite-506423.top/en/registration')
                                
                                # Wait for some element to verify page loaded
                                WebDriverWait(driver, 60).until(
                                    EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='tel']"))
                                )
                                load_success = True
                                break
                            except Exception as e:
                                print(f"Page load attempt {attempt + 1} failed: {str(e)}")
                                time.sleep(5)  # Wait before retry
                        
                        if not load_success:
                            raise Exception("Failed to load page after 3 attempts")

                        # Add extra wait time for VPN connection
                        time.sleep(5)  # Adjust this value based on your VPN speed

                        self.simulate_human_behavior(driver, number)
                        print(f"Successfully processed {number}")
                        break  # Exit retry loop on success
                        
                    except Exception as e:
                        retry_count += 1
                        print(f"Error (attempt {retry_count}/{max_retries}): {str(e)}")
                        
                        if "detached" in str(e).lower():
                            print("Detected detached frame error - waiting longer before retry")
                            time.sleep(10)  # Longer wait for VPN stability
                        
                        if retry_count < max_retries:
                            print(f"Retrying in 5 seconds...")
                            time.sleep(5)
                        else:
                            print(f"Failed to process {number} after {max_retries} attempts")
                    
                    finally:
                        if driver:
                            try:
                                driver.quit()
                            except Exception as e:
                                print(f"Error closing driver: {str(e)}")

        except Exception as e:
            print(f"Fatal error: {str(e)}")
            if driver:
                driver.quit()

if __name__ == "__main__":
    sender = OTPSender()
    sender.process_numbers(2)  # Adjust the number of concurrent browsers as needed
