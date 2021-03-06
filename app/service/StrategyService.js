var jpgp       = require('../lib/jpgp');
var async      = require('async');
var mongoose   = require('mongoose');
var _          = require('underscore');
var Amendment  = mongoose.model('Amendment');
var PublicKey  = mongoose.model('PublicKey');
var Merkle     = mongoose.model('Merkle');
var Vote       = mongoose.model('Vote');

module.exports = function () {

  var KeyService = require('./KeyService').get();
  
  this.tryToPromote = function (am, done) {
    async.waterfall([
      function (next){
        defaultPromotion(am, next);
      },
      function (decision, next){
        if(decision){
          am.promoted = true;
          am.save(function (err) {
            if(!err){
              console.log("Promoted Amendment #" + am.number + " with hash " + am.hash);
              next(null);
            }
            else next(err);
          })
        }
        else next(null)
      },
      function (next){
        // Set new members as known keys
        async.forEach(am.getNewMembers(), function(leaf, callback){
          KeyService.setKnown(leaf, callback);
        }, next);
      },
      function (next){
        // Set new voters as known keys
        async.forEach(am.getNewVoters(), function(leaf, callback){
          KeyService.setKnown(leaf, callback);
        }, next);
      },
    ], done);
  }

  return this;
}


function defaultPromotion (followingAm, decision) {
  async.waterfall([
    function (next) {
      if(!followingAm){
        next('No new amendment for promotion');
        return;
      }
      next();
    },
    function (next){
      Amendment.current(function (err, am) {
        next(null, am);
      });
    },
    function (currentAm, next){
      if(!next){
        next = currentAm;
        currentAm = null;
      }
      // Root amendment does not require votes
      if(!currentAm && followingAm.number == 0){
        next(null, true);
        return;
      }
      if(!currentAm && followingAm.number != 0){
        next('Not promoted: need root amendment first');
        return;
      }
      // Vote for currently promoted: does not require promotion anymore
      if(currentAm && currentAm.number == followingAm.number && currentAm.hash == followingAm.hash){
        next('Stacked vote of currently promoted');
        return;
      }
      // The amendment may be promoted
      async.waterfall([
        function (pass){
          if(followingAm.number != currentAm.number + 1){
            pass('Not promoted: bad number: not a follower of current amendment (#' + followingAm.number + ' does not follow #' + currentAm.number + ')');
            return;
          }
          pass();
        },
        function (pass){
          if(currentAm.hash != followingAm.previousHash){
            pass('Not promoted: bad previous hash: this amendment does not have current amendment as previous');
            return;
          }
          pass();
        },
        function (pass){
          Merkle.signaturesOfAmendment(followingAm.number, followingAm.hash, function (err, merkle) {
            pass(err, merkle);
          });
        },
        function (votesMerkle, pass) {
          if(votesMerkle.leaves().length < currentAm.nextVotes){
            pass('Not promoted: not enough votes for this amendment (requires at least ' + followingAm.nextVotes + ' votes)');
            return;
          }
          pass();
        }
      ], next);
    }
  ], function (err) {
    decision(err, err ? false : true);
  });
}
