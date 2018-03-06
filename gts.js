const shell = require('shelljs');
const parse = require('csv-parse');
var linq = require('linq');
var moment = require('moment');
var stringify = require('csv-stringify');
var fs = require('fs');


var author = "Jakub";
var limit = 200;
var repository = "C:\\Users\\Jakub_admin\\Documents\\srw";
var startDate = moment("2018-02-01").startOf('day');
var endDate = moment("2018-02-28").endOf('day');
var workingHoursStart = moment("09:20", 'HH:mm');
var workingHoursEnd = moment("17:20", 'HH:mm');
var outputFile = "out.csv"

var command = "git log --no-walk -" + limit.toString() + " --author-date-order --author=\"" + author + "\" --pretty=format:\"%H;%an;%aI;%s'\"";

var out = shell
    .cd(repository)
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
        .toArray();

    stringify(records, {delimiter: ';'}, function(err, output){
        fs.writeFile(outputFile, output, (err) => {
            if (err) console.error(err);
        });
    });
}