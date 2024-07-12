'''
Created by ChatGPT: https://chatgpt.com/c/758da791-3241-4e4b-b955-c7c589b1f498
Usage: python src/main.py image.jpg dist
'''
import argparse
from PIL import Image
import numpy as np
import os

def round_to_nearest_gray(array, gray_levels):
    rounded_array = np.zeros_like(array)
    for i in range(len(gray_levels)):
        lower_bound = gray_levels[i] - (gray_levels[1] - gray_levels[0]) / 2
        upper_bound = gray_levels[i] + (gray_levels[1] - gray_levels[0]) / 2
        rounded_array[(array > lower_bound) & (array <= upper_bound)] = gray_levels[i]
    return rounded_array

def process_image(input_path, output_folder, num_levels):
    # Load image
    image = Image.open(input_path).convert('L')  # Convert to grayscale

    # Convert image to numpy array
    img_array = np.array(image, dtype=float) / 255.0  # Normalize pixel values to range 0 to 1

    # Define gray levels
    gray_levels = np.linspace(0, 1, num_levels)

    # Round each pixel to the nearest gray level
    rounded_img_array = round_to_nearest_gray(img_array, gray_levels)

    # Create the output folder if it doesn't exist
    os.makedirs(output_folder, exist_ok=True)

    # Process each gray level
    for i, level in enumerate(gray_levels):
        mask = rounded_img_array <= level
        new_img_array = np.ones_like(rounded_img_array)  # Initialize with white (1.0)
        new_img_array[mask] = rounded_img_array[mask]

        # Convert the array back to an image
        new_image = Image.fromarray((new_img_array * 255).astype(np.uint8))

        # Save the image
        output_path = os.path.join(output_folder, f'image_{i+1}.png')
        new_image.save(output_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process an image to create grayscale steps.")
    parser.add_argument("input_path", type=str, help="Path to the input image.")
    parser.add_argument("output_folder", type=str, help="Folder to save the output images.")
    parser.add_argument("num_levels", type=int, help="Number of gray levels.")

    args = parser.parse_args()

    process_image(args.input_path, args.output_folder, args.num_levels)
