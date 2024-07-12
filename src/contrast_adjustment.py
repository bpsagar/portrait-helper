from PIL import Image, ImageEnhance

def adjust_contrast(image, contrast_level):
    """
    Adjust the contrast of an image.
    
    Parameters:
    image (PIL.Image): The input image.
    contrast_level (float): The contrast level to apply. 1.0 means no change, 
                            less than 1.0 reduces contrast, and greater than 
                            1.0 increases contrast.
                            
    Returns:
    PIL.Image: The contrast-adjusted image.
    """
    enhancer = ImageEnhance.Contrast(image)
    return enhancer.enhance(contrast_level)
