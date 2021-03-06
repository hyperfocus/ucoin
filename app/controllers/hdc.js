var jpgp       = require('../lib/jpgp');
var async      = require('async');
var mongoose   = require('mongoose');
var _          = require('underscore');
var Amendment  = mongoose.model('Amendment');
var PublicKey  = mongoose.model('PublicKey');
var Merkle     = mongoose.model('Merkle');

module.exports = function (pgp, currency, conf) {

  this.amendments = require('./amendments')(pgp, currency, conf);
  this.transactions = require('./transactions')(pgp, currency, conf);
  this.coins = require('./coins')(pgp, currency, conf);
  
  return this;
}
