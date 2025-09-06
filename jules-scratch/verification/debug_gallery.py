from playwright.sync_api import sync_playwright

def handle_console(msg):
    print(f"Browser Console: {msg.text}")

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.on("console", handle_console)
    page.goto("http://localhost:3000/gallery", wait_until="networkidle")
    print("Page loaded.")
    page.wait_for_timeout(5000)
    print(page.content())
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
