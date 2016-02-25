# FilePicker

Integrating with cloud services such as Google Drive and Dropbox is always time consuming. FilePicker provides an easy way to integrate these services with Meteor, without requiring any expensive SAAS software. Authentication is handled by the core authentication packages (accounts-google ect)

## Usage
FilePicker makes provides the `FilePicker` object available on the client and the server. This object can be used to launch file pickers, or handle events.
```javascript
    // Launch a file picker for the service
    FilePicker.pickWithGoogle(callback)
    FilePicker.pickWithDropbox(callback)
    FilePicker.pickWithBox(callback)
    FilePicker.pickWithOnedrive(callback)

    // Callbacks are in the standard node form
    var callback = function(error,response){
        response.service; // 'google'
        response.accessToken; // 'SaSsdA9AG9sfu98wue23fs8s'
        response.fileId; // 'FILE-nssawqsan32poadjpa-msyt'
    }

    // Files can be downloaded on the server or client
    FilePicker.pickWithGoogle(function(error,file){
        if (error) throw error;
        FilePicker.download(response,function(error,file){
            file.data; //!!!!!
        });
    });
```


## Installation

    meteor add nitrolabs:filepicker

## Development
This package is actively maintained and supported by [NitroLabs](http://www.nitrolabs.com/).
Pull requests and feature suggestions welcome.

## License

MIT