soapq.js
=======

A simple node server to process SOAP API requests and callback with the results.

client
------

soapq.js can be accessed using any HTTP client. A request to process should be a JSON
object containing the following data:

```
{
  key: the unique key for a given set of requests
  callback: URL to respond to with the results of the API call
  payload: an array of API requests:
    [{
      endpoint: URL to send the API request to
      envelope: a SOAP XML envelope to send to the server
      security: (optional) httpauth information for the API endpoint
        {
          username: the API user
          password: the API password
        }
    }]
}
```

The soapq server will respond to the given callback with a JSON object containing
the operation status and an array of responses:

```
{
  status: (true|false)
  responses: array of SOAP response XML
}
```

callback response
-----------------

soapq.js expets a JSON response from the callback as follows:
<code>{ status: (true|false), data: message }</code>

if the callback worked, true should be returned in the status field.

pseudo transactions
-------------------

You can simulate a transaction by sending an array of requests in the request payload.
The soapq server will process each request in the order you send them and will
return the results in the order they were requested in.
