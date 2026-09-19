(function (global) {
    'use strict';

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = require('./Interactive-Elements/book-education.js');
    } else if (typeof global !== 'undefined' && global.initBookEducation) {
    }
})(typeof window !== 'undefined' ? window : this);
