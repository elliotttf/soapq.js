soapq.sj
=======

A simple node server to process SOAP API requests and callback with the results.

client
------

soapq.js can be accessed using any HTTP client. A request to process should be a JSON
object containing the following data:

{
  key: the unique key for a given set of requests
  callback: URL to respond to with the results of the API call
  payload: an array of API requests:
    [{
      endpoint: URL to send the API request to
      method: The SOAP method to call
      envelope: a SOAP XML envelope to send to the server
    }]
  security: (optional) httpauth information for the API endpoint
    {
      username: the API user
      password: the API password
    }
}

callback response
-----------------

soapq.js expets a JSON response from the callback as follows:
{ status: (true|false), data: message }

if the callback worked, true should be returned in the status field.
