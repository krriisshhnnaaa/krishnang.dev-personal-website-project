/**
 * ==============================================================================
 * book-education.js — Root Entry Point & Interactive Controller
 * ==============================================================================
 * 
 * Re-exports the canonical implementation from Interactive-Elements/book-education.js
 * ensuring seamless resolution across both root and component-level directory imports.
 */

(function (global) {
    'use strict';

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = require('./Interactive-Elements/book-education.js');
    } else if (typeof global !== 'undefined' && global.initBookEducation) {
        // Already loaded via global namespace
    }
})(typeof window !== 'undefined' ? window : this);
