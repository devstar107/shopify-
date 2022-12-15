module.exports.slugify = (text) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')               // Replace spaces with -
        .replace(/[\u0300-\u036f]/g, "")    // Convert accent to non accent
        .replace(/[^\w\-]+/g, '')           // Remove all non-word chars
        .replace(/\-\-+/g, '-')             // Replace multiple - with single -
        .replace(/^-+/, '')                 // Trim - from start of text
        .replace(/-+$/, '')                 // Trim - from end of text
}

module.exports.sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports.isEmpty = (value) => {
    if (Array.isArray(value))
        return value.length === 0
    else
        return value === '' || value == null
}

module.exports.disambiguateLabel = (key, value, t) => {
    switch (key) {
        case 'syncStatus':
            return t.products('sync_status') + ' : ' + value.map((val) => `${t.products(`status.${val}`)}`).join(', ')
        default:
            return value
    }
}