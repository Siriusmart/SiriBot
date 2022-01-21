function parseDate(millis, more) {
    let str_out = [];
    if (millis > 31536000000) {
        const yrs = Math.floor(millis / 31536000000);
        millis -= yrs * 31536000000;
        str_out.push((yrs === 1) ? '1 year' : `${yrs} years`);
    }
    if (millis > 2419200000) {
        const months = Math.floor(millis / 2419200000);
        millis -= months * 2419200000;
        str_out.push((months === 1) ? '1 month' : `${months} months`);
    }

    if (millis > 604800000) {
        const weeks = Math.floor(millis / 604800000);
        millis -= weeks * 604800000;
        str_out.push((weeks === 1) ? '1 week' : `${weeks} weeks`);
    }

    if (millis > 86400000) {
        const days = Math.floor(millis / 86400000);
        millis -= days * 86400000;
        str_out.push((days === 1) ? '1 day' : `${days} days`);
    }

    if (millis > 86400000) {
        const days = Math.floor(millis / 86400000);
        millis -= days * 86400000;
        str_out.push((days === 1) ? '1 day' : `${days} days`);
    }

    if (millis > 3600000) {
        const hours = Math.floor(millis / 3600000);
        millis -= hours * 3600000;
        str_out.push((hours === 1) ? '1 hour' : `${hours} hours`);
    }

    if (millis > 60000) {
        const minutes = Math.floor(millis / 60000);
        millis -= minutes * 60000;
        str_out.push((minutes === 1) ? '1 minute' : `${minutes} minutes`);
    }

    if (millis > 1000) {
        const seconds = Math.floor(millis / 1000);
        millis -= seconds * 1000;
        str_out.push((seconds === 1) ? '1 second' : `${seconds} seconds`);
    }

    switch (str_out.length) {
        case 0:
            return more ? '1 more second' : '1 second';
        case 1:
            return more ? str_out[0].replace(' ', ' more ') : str_out[0];
        default:
            return more ? `${str_out.slice(0, -1).join(', ')} and ${str_out[str_out.length - 1].replace(' ', ' more ')}` : `${str_out.slice(0, -1).join(', ')} and ${str_out[str_out.length - 1]}`
    }

}

module.exports = parseDate;