'use strict';
const r = require('root/lib/r');
const restify = require('restify');
const _ = require('lodash');
const jwt = require('jsonwebtoken');

exports.validateEmail = (req, res, next) => {
  const emails = req.body.emails;
  if (!emails) return next();

  let query = r
    .table('entities')
    .filter(entity =>
      // `.contains()` does not compare arrays to arrays.
      entity('emails').setIntersection(req.body.emails).count().gt(0));

  if (req.params.id) {
    query = query.filter(entity => entity('id').ne(req.params.id));
  }

  query
  .isEmpty()
  .run()
  .then(empty =>
    empty ? next() : next(new restify.ConflictError('emails must be unique')));
}

exports.validateRevision = (req, res, next) => {
  r.table('entities')
  .get(req.params.id)
  .getField('rev')
  .eq(req.body.rev)
  .run()
  .then(equal =>
    equal ? next() : next(new restify.ConflictError('rev must be equal')));
}

exports.defaultEntity = {
  permissions: [],
  inherited_permissions: []
};

exports.decodeToken = (token) => new Promise((resolve, reject) => {
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) reject(err);
    resolve(decoded);
  });
});

exports.buildQuery = (reqQuery, reqParams) => {
  let query = r.table('entities');

  if (reqQuery.email) {
    query = query.filter(entity => entity('emails').contains(reqQuery.email));
  }

  if (reqQuery.perm) {
    query = query.filter(entity =>
      entity('permissions').setIntersection([{
        type: reqQuery.perm.type,
        entity: reqQuery.perm.entity
      }]).count().gt(0));
  }

  if (reqParams.id) {
    query = query.get(reqParams.id)
  }

  return query;
}