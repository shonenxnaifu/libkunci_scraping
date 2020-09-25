const express = require('express')
const app = express()
const puppeteer = require('puppeteer')
const { Parser } = require('json2csv')

app.get('/scrap/jsondata', (req, res, next) => {
    const fields = [
        {
            label: 'Title',
            value: 'title'
        },
        {
            label: 'ID',
            value: 'id'
        },
        {
            label: 'Link',
            value: 'link_catalog'
        },
        {
            label: 'Edition',
            value: 'edition'
        },
        {
            label: 'Call Number',
            value: 'call_number'
        },
        {
            label: 'ISBN/ISSN',
            value: 'isbn_issn'
        },
        {
            label: 'Authors',
            value: 'authors'
        },
        {
            label: 'Subjects',
            value: 'subjects'
        },
        {
            label: 'Classification',
            value: 'classification'
        },
        {
            label: 'Series Title',
            value: 'series_title'
        },
        {
            label: 'GMD',
            value: 'gmd'
        },
        {
            label: 'Language',
            value: 'language'
        },
        {
            label: 'Publisher',
            value: 'publisher'
        },
        {
            label: 'Publishing Year',
            value: 'publishing_year'
        },
        {
            label: 'Publishing Place',
            value: 'publishing_place'
        },
        {
            label: 'Collation',
            value: 'collation'
        },
        {
            label: 'Abstract/Notes',
            value: 'abstract_notes'
        },
        {
            label: 'Specific Detail Info',
            value: 'specific_info_detail'
        },
        {
            label: 'File Attachment',
            value: 'file_attachment'
        },
        {
            label: 'Availability',
            value: 'availability'
        }
    ]

    scrap().then(response => {
        const json2csv = new Parser({ fields })
        const csv = json2csv.parse(response)
        res.header('Content-Type', 'text/csv')
        res.attachment('Data_Lib_Kunci.csv')
        return res.send(csv)
        // res.json(response)
    })
})

async function scrap() {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.setRequestInterception(true)

    page.on('request', (req) => {
        if (['image', 'stylesheet', 'font', 'script'].indexOf(req.resourceType()) !== -1) {
            req.abort()
        } else {
            req.continue()
        }
    })

    await page.goto('http://lib.kunci.or.id/index.php?page=1')

    // Get total pages in web site
    const totalPage = await getTotalPage(page)

    let dataAllId = []

    for (let i = 1; i <= totalPage; i++) {
        // Scrap list items
        console.log(`scraping page ${i}`)
        await page.goto(`http://lib.kunci.or.id/index.php?page=${i}`)

        const data = await page.evaluate(() => {
            let arrData = []
            const mainItem = document.querySelectorAll('#left .item')

            mainItem.forEach(item => {
                arrData.push({
                    id: item.firstChild.getAttribute('href').split('=')[2],
                    link_catalog: 'https://lib.kunci.or.id/' + item.firstChild.getAttribute('href'),
                    title: item.firstChild.innerHTML,
                    edition: '',
                    call_number: '',
                    isbn_issn: '',
                    authors: '',
                    subjects: '',
                    classification: '',
                    series_title: '',
                    gmd: '',
                    language: '',
                    publisher: '',
                    publishing_year: '',
                    publishing_place: '',
                    collation: '',
                    abstract_notes: '',
                    specific_info_detail: '',
                    file_attachment: '',
                    availability: ''
                })
            })

            return arrData
        })

        // Scrap detail items
        for (let j = 0; j < data.length; j++) {

            console.log(`scraping detail: ${data[j].id}:${j+1}`)
            await page.goto(`http://lib.kunci.or.id/index.php?p=show_detail&id=${data[j].id}`)

            const dataDetail = await page.evaluate(() => {
                const mainItem = document.querySelectorAll('#left table tbody tr')
                let authors = []
                let subjects = []

                // Get authors
                if (mainItem[5].querySelectorAll('.tblContent a')) {
                    const tempAuthors = mainItem[5].querySelectorAll('.tblContent a')
                    tempAuthors.forEach(item => {
                        authors.push(item.textContent)
                    })
                }

                // Get subjects
                if (mainItem[6].querySelectorAll('.tblContent a')) {
                    const tempSubjects = mainItem[6].querySelectorAll('.tblContent a')
                    tempSubjects.forEach(item => {
                        subjects.push(item.textContent)
                    })
                }

                return {
                    edition: mainItem[1].querySelector('.tblContent') ? mainItem[1].querySelector('.tblContent').textContent : '',
                    call_number: mainItem[2].querySelector('.tblContent') ? mainItem[2].querySelector('.tblContent').textContent : '',
                    isbn_issn: mainItem[3].querySelector('.tblContent') ? mainItem[3].querySelector('.tblContent').textContent : '',
                    authors: authors.join('; '),
                    subjects: subjects.join(', '),
                    classification: mainItem[7].querySelector('.tblContent') ? mainItem[7].querySelector('.tblContent').textContent : '',
                    series_title: mainItem[8].querySelector('.tblContent') ? mainItem[8].querySelector('.tblContent').textContent : '',
                    gmd: mainItem[9].querySelector('.tblContent') ? mainItem[9].querySelector('.tblContent').textContent : '',
                    language: mainItem[10].querySelector('.tblContent') ? mainItem[10].querySelector('.tblContent').textContent : '',
                    publisher: mainItem[11].querySelector('.tblContent') ? mainItem[11].querySelector('.tblContent').textContent : '',
                    publishing_year: mainItem[12].querySelector('.tblContent') ? mainItem[12].querySelector('.tblContent').textContent : '',
                    publishing_place: mainItem[13].querySelector('.tblContent') ? mainItem[13].querySelector('.tblContent').textContent : '',
                    collation: mainItem[14].querySelector('.tblContent') ? mainItem[14].querySelector('.tblContent').textContent : '',
                    abstract_notes: mainItem[15].querySelector('.tblContent') ? mainItem[15].querySelector('.tblContent').textContent : '',
                    specific_info_detail: mainItem[16].querySelector('.tblContent') ? mainItem[16].querySelector('.tblContent').textContent : '',
                    file_attachment: mainItem[18].querySelector('.tblContent #attachListLoad') ? mainItem[18].querySelector('.tblContent #attachListLoad').textContent : '',
                    availability: mainItem[19].querySelector('.tblContent #itemListLoad') ? mainItem[19].querySelector('.tblContent #itemListLoad').textContent : '',
                }
            })

            data[j].edition = dataDetail.edition
            data[j].call_number = dataDetail.call_number
            data[j].isbn_issn = dataDetail.isbn_issn
            data[j].authors = dataDetail.authors
            data[j].subjects = dataDetail.subjects
            data[j].classification = dataDetail.classification
            data[j].series_title = dataDetail.series_title
            data[j].gmd = dataDetail.gmd
            data[j].language = dataDetail.language
            data[j].publisher = dataDetail.publisher
            data[j].publishing_year = dataDetail.publishing_year
            data[j].publishing_place = dataDetail.publishing_place
            data[j].collation = dataDetail.collation
            data[j].abstract_notes = dataDetail.abstract_notes
            data[j].specific_info_detail = dataDetail.specific_info_detail
            data[j].file_attachment = dataDetail.file_attachment
            data[j].availability = dataDetail.availability
        }

        // Concat all data from previous pages
        dataAllId = dataAllId.concat(data)

        console.log(`page ${i} scraped at ${getCurrentTime()}`)
    }

    await browser.close()

    return dataAllId
}

async function convertToCsv() {

}

async function getTotalPage(page) {
    const totalPage = await page.evaluate(() => {
        const hrefEl = document.querySelector('#left .pagingList a:last-child').getAttribute('href')
        const pageNumber = hrefEl.split('=')[1]
        return pageNumber
    })

    return totalPage
}

function getCurrentTime() {
    const d = new Date()
    const h = d.getHours()
    const m = d.getMinutes()

    return `${h}:${m}`
}

let server = app.listen(3000, () => {
    console.log('server running on port 3000')
})

server.setTimeout(6000000)