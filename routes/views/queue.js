'use strict';

const keystone = require('keystone');
const punycodeUrl = require('punycode-url');

exports = module.exports = function(req, res) {

  const Session = keystone.list('Session');
  const Queue = keystone.list('Queue');
  const SessionStats = keystone.list('SessionStats');
  const Participant = keystone.list('Participant');

  const view = new keystone.View(req, res);
  const locals = res.locals;

  locals.reactData.app.view = 'queue';
  locals.reactData.view.csrf = locals.csrf_token_value;
  locals.reactData.view.courseId = locals.course._id.toString();

  locals.additionalResources = '<script src="/neuvontajono/scripts/jquery-2.2.4.min.js"></script>';

  // **********************************************************************************************

  view.on('post', { action: 'add' }, function(next) {

    Session.model.findOne({ course: locals.course._id, _id: req.body.sessionId, active: true }).populate('course').exec(
      function(err, session) {

        if (err) {
          return res.json({ error: true });
        }

        if (session && session.isOpen()) {

          if (req.body.callURL && (req.body.callURL.indexOf('https://') !== 0 && req.body.callURL.indexOf('http://') !== 0)) {
            req.body.callURL = '';
          }

          if (req.body.participationMode === 'remote') {
            req.body.row = -1;
          } else {
            req.body.callURL = '';
          }

          req.body.callURL = req.body.callURL || '';
          req.body.callURL = punycodeUrl.toASCII(req.body.callURL.trim());

          Queue.model.addToQueue(locals.course, session, locals.user, req.body.location, req.body.row, req.body.language, req.body.callURL,
            function(err) {

              SessionStats.model.saveQueueLength(locals.course, session);

              if (err) {
                res.json({ error: true });
              } else {
                next();
              }

            });

        } else {
          return res.json({ error: true });
        }

      });

  });

  // **********************************************************************************************

  view.on('post', { action: 'signUp' }, function(next) {

    Session.model.findOne({ course: locals.course._id, _id: req.body.sessionId, active: true }).populate('course').exec(
      function(err, session) {

        if (err) {
          return res.json({ error: true });
        }

        if (session && session.isOpen()) {

          Participant.model.addParticipant(locals.course, session, locals.user._id, req.body.location, true,
            function() {

              if (err) {
                res.json({ error: true });
              } else {
                locals.user.previousLocation = req.body.location;
                locals.user.save(function() {
                  next();
                });
              }

            });

        } else {
          return res.json({ error: true });
        }

      });

  });

  // **********************************************************************************************

  view.on('post', { action: 'remove' }, function(next) {

    Queue.model.removeUser(locals.course, locals.user, function(err) {

      if (err) {
        res.json({ error: true });
      } else {
        next();
      }

    });

  });

  // **********************************************************************************************
  view.on({}, function(next) {

    locals.course.createSummary(locals.user, function(err, summary) {
      if (err) {
        return res.json({ error: true });
      } else {
        locals.reactData.view.queueData = summary;
        if (req.xhr) {
          return res.json(summary);
        }
        next();
      }
    });

  });

  // **********************************************************************************************

  view.render('reactView', locals);

};
