const moment = require('moment-timezone');
const errors = require('@tryghost/errors');
const models = require('../../models');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'analytics',

    memberGrowth: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'start_date',
            'end_date'
        ],
        permissions: {
            method: 'browse'
        },
        async query(frame) {
            const startDate = frame.options.start_date || moment().subtract(30, 'days').format('YYYY-MM-DD');
            const endDate = frame.options.end_date || moment().format('YYYY-MM-DD');

            const members = await models.Member.findAll({
                columns: ['created_at'],
                filter: `created_at:>='${startDate}'+created_at:<='${endDate}'`
            });

            const groupedByDate = {};
            members.forEach(member => {
                const date = moment(member.get('created_at')).utc().format('YYYY-MM-DD');
                groupedByDate[date] = (groupedByDate[date] || 0) + 1;
            });

            const data = Object.keys(groupedByDate).map(date => ({
                date,
                count: groupedByDate[date]
            }));

            return {
                start_date: startDate,
                end_date: endDate,
                data
            };
        }
    }
};

module.exports = controller;
