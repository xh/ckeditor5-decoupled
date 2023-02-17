import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import FileRepository from '@ckeditor/ckeditor5-upload/src/filerepository';

import Adapter from './adapter';

export default class S3Upload extends Plugin {

    static get requires() {
        return [FileRepository];
    }

    static get pluginName() {
        return 'S3Upload';
    }

    init() {
        const requiredKeys = [
            'preSignPath',
            'bucket',
            'keyPrefix'
        ];

        let misconfiguration = false;
        requiredKeys.forEach(it => {
            const val = this.editor.config.get(`s3Upload.${it}`);
            if (!val) {
                misconfiguration = true;
                console.warn(`s3Upload.${it} is not configured`);
            }
        });

        if (misconfiguration) return;


        const s3Conf = this.editor.config.get('s3Upload');
        this.editor.plugins.get('FileRepository').createUploadAdapter = loader => new Adapter(loader, s3Conf);
    }
}
