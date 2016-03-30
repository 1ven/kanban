const QueryFile = require('pg-promise').QueryFile;
const path = require('path');
const Promise = require('bluebird');
const _ = require('lodash');

exports.sql = function(file) {
    const p = path.resolve(__dirname, './db/tables/', file);
    const options = {
        minify: true
    };
    return new QueryFile(p, options);
};

exports.checkRequiredParams = (givenParams, requiredParams) => {
    if (_.isPlainObject(givenParams)) {
        givenParams = _.keys(givenParams);
    }

    const promises = _.map(requiredParams, param => {
        if (!_.includes(givenParams, param)) {
            return Promise.reject(
                new Error(`'${param}' is required`)
            );
        };

        return Promise.resolve();
    });

    return Promise.all(promises);
};