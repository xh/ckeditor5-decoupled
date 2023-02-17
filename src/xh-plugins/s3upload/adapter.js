import {v4 as uuid} from 'uuid';

// see https://ckeditor.com/docs/ckeditor5/latest/framework/guides/deep-dive/upload-adapter.html
export default class Adapter {
    constructor(loader, s3Conf) {
        this.loader = loader;
        this.s3Conf = s3Conf;
    }

    // method called by CKEditor
    upload() {
        return this.loadFileAsync()
            .then(async () => {
                const presignedUrl = await this.getSignedUrlAsync();
                await this.putInBucketAsync(presignedUrl);
                this.controller = null;

                const {bucket, keyPrefix} = this.s3Conf;
                return {default: `https://${bucket}.s3.amazonaws.com/${keyPrefix}${this.filename}`};
            });
    }

    // method called by CKEditor
    abort() {
        this.controller?.abort();
    }

  
    //------------------------------
    // Implementation
    //------------------------------
    loadFileAsync() {        
        this.controller = new AbortController();

        return new Promise((resolve, reject) => {
            this.loader.file.then(file => {
                this.file = file;
                this.filename = this.sanitizeFilename(this.file.name);
                resolve();
            });
        });
    }

    async getSignedUrlAsync() {
        const headers = new Headers({ 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }),
            options = {
                method: 'POST',
                credentials: 'include',
                headers: headers,
                body: `key=${this.s3Conf.keyPrefix}${this.filename}&contentType=${this.file.type}`,
                signal: this.controller.signal
            },
            response = await fetch(this.s3Conf.preSignPath, options),
            json = await response.json();

        return json.url;
    }

    putInBucketAsync(url) {
        const headers = new Headers({ 'Content-Type': this.file.type }),
            options = {
                method: 'PUT',
                headers,
                body: this.file,
                signal: this.controller.signal
            };

        return fetch(url, options);
    }

    sanitizeFilename(filename) {
        // Split the filename into its basename and extension
        const tokens = filename.split('.').length;
        const basename = tokens > 1 ? filename.split('.').slice(0, -1).join('.') : filename;
        const extension = tokens > 1 ? filename.split('.').pop() : null;
      
        // Sanitize the basename by replacing any non-alphanumeric characters with an underscore
        const sanitizedBasename = basename.replace(/[^a-zA-Z0-9]/g, '-');
      
        // Reconstruct the filename by appending the sanitized basename and original extension (if it exists)
        return extension ? `${sanitizedBasename}-${uuid()}.${extension}` : `${sanitizedBasename}-${uuid()}`;
    }

}
