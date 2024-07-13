import argparse
from PIL import Image
import numpy as np
import os
from contrast_adjustment import adjust_contrast
from draw_outline import draw_outline  # Corrected import statement

def round_to_nearest_gray(array, gray_levels):
    rounded_array = np.zeros_like(array)
    for i in range(len(gray_levels)):
        lower_bound = gray_levels[i] - (gray_levels[1] - gray_levels[0]) / 2
        upper_bound = gray_levels[i] + (gray_levels[1] - gray_levels[0]) / 2
        if i == 0:
            mask = (array <= gray_levels[i])
        elif i == len(gray_levels) - 1:
            mask = (array > gray_levels[i-1])
        else:
            mask = (array > gray_levels[i-1]) & (array <= gray_levels[i])
        rounded_array[mask] = gray_levels[i]
    return rounded_array

def process_image(input_path, output_folder, num_levels, contrast_level, sigma):
    # Load image
    image = Image.open(input_path).convert('L')  # Convert to grayscale

    # Optionally adjust contrast
    if contrast_level is not None:
        image = adjust_contrast(image, contrast_level)

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
        # Create a mask where the pixels are less than or equal to the current gray level
        mask = rounded_img_array <= level

        # Create a new image array with all pixels set to white (1.0)
        new_img_array = np.ones_like(rounded_img_array)  # Initialize with white (1.0)

        # Set the mask pixels to the corresponding gray level
        new_img_array[mask] = rounded_img_array[mask]

        # Convert the array back to an image
        new_image = Image.fromarray((new_img_array * 255).astype(np.uint8))

        # Save the filled image
        output_path = os.path.join(output_folder, f'image_{i+1}.png')
        new_image.save(output_path)

        # Generate and save the outline image
        outline_image = draw_outline(new_image, sigma)
        outline_output_path = os.path.join(output_folder, f'image_{i+1}_outline.png')
        outline_image.save(outline_output_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process an image to create grayscale steps and outlines.")
    parser.add_argument("input_path", type=str, help="Path to the input image.")
    parser.add_argument("output_folder", type=str, help="Folder to save the output images.")
    parser.add_argument("num_levels", type=int, help="Number of gray levels.")
    parser.add_argument("--contrast_level", type=float, help="Contrast level to apply to the image.", default=None)
    parser.add_argument("--sigma", type=float, help="Sigma value for Canny edge detection.", default=1.0)

    args = parser.parse_args()

    process_image(args.input_path, args.output_folder, args.num_levels, args.contrast_level, args.sigma)
