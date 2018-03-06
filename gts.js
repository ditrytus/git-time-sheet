#!/usr/bin/env node
'use strict';

const shell = require('shelljs');
const parse = require('csv-parse');
var linq = require('linq');
var moment = require('moment');
var stringify = require('csv-stringify');
var fs = require('fs');
var ArgumentParser = require('argparse').ArgumentParser;

var parser = new ArgumentParser({
  version: '0.1.0',
  addHelp:true,
  description: 'Generates time sheet report from git log.'
});

parser.addArgument(
    [ '-r', '--repository' ],
    {
      help: "Path to a folder with git repository. Default: working directory.",
      defaultValue: undefined
    }
  );

parser.addArgument(
  [ '-a', '--author' ],
  {
    help: 'Author of commits. Only commits which author contains this value will be included.',
    required: true
  }
);

parser.addArgument(
    [ '-l', '--limit' ],
    {
      help: "Maximum number of commits that will be inspected. This value limits the amount of processed commits so that the script does not have to inspect entire log every time. Default: 200.",
      defaultValue: 200
    }
  );

parser.addArgument(
    [ '-p', '--period' ],
    {
      help: "Period length for which to generate the report. Default: month.",
      choices: ['day', 'week', 'month', 'year'],
      defaultValue: 'month'
    }
  );

parser.addArgument(
    [ '-n', '--periodNumber' ],
    {
      help: "Number of period where 0 means the current period, -1 previous one. Ex. -p month -n -2 = two months ago. Default: 0.",
      defaultValue: 0
    }
  );

parser.addArgument(
    [ '-w', '--workingDayStart' ],
    {
      help: "An hour when you usually start work. It is used to calculate duration of first commit in a given day in format HH:mm. Default: 09:00.",
      defaultValue: '09:00'
    }
);

parser.addArgument(
    [ '-o', '--output' ],
    {
      help: "Output CSV file name (with extension). Default: out.csv.",
      defaultValue: 'out.csv'
    }
);

var args = parser.parseArgs();

var workingDirectory = shell.pwd().stdout;

if (!args.repository) args.repository = workingDirectory;

var selectedPeriod = moment().add(args.periodNumber, args.period);
var startDate = selectedPeriod.clone().startOf(args.period);
var endDate = selectedPeriod.clone().endOf(args.period);

var workingHoursStart = moment(args.workingDayStart, 'HH:mm');

var command = "git log --no-walk -" + args.limit.toString() + " --author-date-order --author=\"" + args.author + "\" --pretty=format:\"%H;%an;%aI;%s'\"";

var out = shell
    .cd(args.repository)
    .exec(
        command,
        {silent:true})
    .stdout;

parse(
    out,
    {delimiter: ';', auto_parse: true},
    (err, output) => processLog(output));

function processLog(arrays)
{
    var records = linq.from(arrays)
        .select(a => {
            return {
                sha: a[0],
                author: a[1],
                time: moment(a[2]),
                message: a[3]
            }})
        .where(e => e.time >= startDate && e.time <= endDate)
        .select(e => {
            var regex = /[A-Z]*-[1-9][0-9]*/
            var match = regex.exec(e.message);
            if (match) {
                e.JIRA = match[0];
            }
            delete e.message;
            return e;
        })
        .reverse()
        .groupBy(
            e => e.time.clone().startOf('day').toISOString(),
            e => e)
        .select(e => {
            function setTime(momentDate, momenTime)
            {
                return momentDate.clone().startOf('day')
                    .set(
                    {
                        hour:   momenTime.get('hour'),
                        minute: momenTime.get('minute'),
                        second: momenTime.get('second')
                    });
            };

            var first = e.first();

            var workStart = setTime(first.time, workingHoursStart);

            function setDuration(element, startTime, endTime)
            {
                element.duration = endTime.diff(startTime, 'minutes');
                if (element.duration < 0) element.duration = 5;
                
                element.duration = moment()
                    .startOf('day')
                    .add(
                        element.duration,
                        'minutes')
                    .format('HH:mm:ss');
            };

            setDuration(first, workStart, first.time);

            e.pairwise((prev, current) => {
                return {prev: prev, current: current};
            })
            .forEach(pair => {
                setDuration(pair.current, pair.prev.time, pair.current.time)
            });

            return e;
        })
        .selectMany(e => e)
        .select(e => {
            e.time = e.time.format("YYYY-MM-DD HH:mm:ss");
            return e;
        })
        .toArray();

    stringify(records, {delimiter: ';'}, function(err, output){
        shell.cd(workingDirectory);
        fs.writeFile(args.output, output, (err) => {
            if (err) console.error(err);
        });
    });
}