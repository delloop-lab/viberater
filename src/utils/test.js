/**
 * Adds two numbers together
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} The sum of a and b
 */
function addNumbers(a, b) {
    return a + b;
}

// Convert strings to numbers before passing them to the function
const result = addNumbers(parseInt("5"), parseInt("10"));

// Export the function to make it a module
export { addNumbers }; 