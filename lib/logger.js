"use strict";
var levels = require('./levels')
, util = require('util')
, events = require('events')
, DEFAULT_CATEGORY = '[default]';

var logWritesEnabled = true;

/**
 * Models a logging event.
 * @constructor
 * @param {String} categoryName name of category
 * @param {Log4js.Level} level level of message
 * @param {Array} data objects to log
 * @param {Log4js.Logger} logger the associated logger
 * @author Seth Chisamore
 */
function LoggingEvent (categoryName, level, data, logger) {
  this.startTime = new Date();
  this.categoryName = categoryName;
  this.data = data;
  this.level = level;
  this.logger = logger;
  this.fields = [];
}

/**
 * Proxy for emitting log events that allows manipulating loggingEvent after it's creation through convenience methods
 * @constructor
 * @param {Log4js.LoggingEvent} event loggingEvent instance
 * @param {Log4js.Logger} logger the associated logger
 * @author Joona Kulmala
 */
function LoggingProxy(event, logger) {
  var proxy = this;
  this.loggingEvent = event;

  if(logger) {
    process.nextTick(function () {
      logger.emit("log", proxy.loggingEvent);
    });
  }
}

LoggingProxy.prototype.fields = function(object){
  this.loggingEvent.fields.push(object);
  return this;
};

LoggingProxy.prototype.with = function(object){
  this.loggingEvent.fields.push(object);
  return this;
};

/**
 * Logger to log messages.
 * use {@see Log4js#getLogger(String)} to get an instance.
 * @constructor
 * @param name name of category to log to
 * @author Stephan Strittmatter
 */
function Logger (name, level) {
  this.category = name || DEFAULT_CATEGORY;

  if (level) {
    this.setLevel(level);
  }
}
util.inherits(Logger, events.EventEmitter);
Logger.DEFAULT_CATEGORY = DEFAULT_CATEGORY;
Logger.prototype.level = levels.TRACE;

Logger.prototype.setLevel = function(level) {
  this.level = levels.toLevel(level, this.level || levels.TRACE);
};

Logger.prototype.removeLevel = function() {
  delete this.level;
};

Logger.prototype.log = function() {
  var args = Array.prototype.slice.call(arguments)
  , logLevel = levels.toLevel(args.shift(), levels.INFO)
  , loggingEvent;
  if (this.isLevelEnabled(logLevel)) {
    loggingEvent = new LoggingEvent(this.category, logLevel, args, this);
    if(typeof this.loggingProxy === "function") {
      return new this.loggingProxy(loggingEvent, this);
    } else {
      this.emit("log", loggingEvent);
    }
  }
};

Logger.prototype.isLevelEnabled = function(otherLevel) {
  return this.level.isLessThanOrEqualTo(otherLevel);
};

['Trace','Debug','Info','Warn','Error','Fatal', 'Mark'].forEach(
  function(levelString) {
    var level = levels.toLevel(levelString);
    Logger.prototype['is'+levelString+'Enabled'] = function() {
      return this.isLevelEnabled(level);
    };
    
    Logger.prototype[levelString.toLowerCase()] = function () {
      if (logWritesEnabled && this.isLevelEnabled(level)) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(level);
        return Logger.prototype.log.apply(this, args);
      } else {
        if(typeof this.loggingProxy === "function") {
          var proxy = this.loggingProxy;
          return function(){
            return new proxy({});
          }
        } else {
          return function() {};
        }
      }
    };
  }
);

/**
 * Disable all log writes.
 * @returns {void}
 */
function disableAllLogWrites() {
  logWritesEnabled = false;
}

/**
 * Enable log writes.
 * @returns {void}
 */
function enableAllLogWrites() {
  logWritesEnabled = true;
}

exports.LoggingEvent = LoggingEvent;
exports.LoggingProxy = LoggingProxy;
exports.Logger = Logger;
exports.disableAllLogWrites = disableAllLogWrites;
exports.enableAllLogWrites = enableAllLogWrites;
