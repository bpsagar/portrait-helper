from PIL import Image
import numpy as np
from skimage import feature

def draw_outline(image, sigma):
    """
    Generate an outline of the image using Canny edge detection.
    
    Parameters:
    image (PIL.Image): The input image.
    sigma (float): The sigma value for the Canny edge detection.
    
    Returns:
    PIL.Image: The image with edges highlighted.
    """
    img_array = np.array(image, dtype=float) / 255.0  # Normalize pixel values to range 0 to 1

    # Perform Canny edge detection
    edges = feature.canny(img_array, sigma=sigma)

    # Invert the edges to get black lines on white background
    inverted_edges = np.invert(edges)

    # Convert the edges to an image (black lines on white background)
    outline_image = Image.fromarray((inverted_edges * 255).astype(np.uint8))  # Black lines on white background

    return outline_image
