from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Screenshot of the gallery page
    page.goto("http://localhost:3000/gallery")
    page.wait_for_timeout(5000) # wait for 5 seconds
    page.screenshot(path="jules-scratch/verification/gallery_page.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
