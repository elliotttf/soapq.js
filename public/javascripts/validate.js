/**
 * @fileoverview Validates the registration form client-side.
 */

$(document).ready(function() {
  $('#register-form').validate({
    rules: {
      mail: {
        required: true,
        email: true
      },
      domain: 'required'
    }
  });
});

