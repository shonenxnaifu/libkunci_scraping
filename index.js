const express = require('express')
const app = express()
const puppeteer = require('puppeteer')

app.get('/scrap/jsondata', (req, res, next) => {
    scrap().then(response => {
        res.json(response)
    })
})

async function scrap() {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    await page.goto('http://lib.kunci.or.id/index.php?page=1')

    const totalPage = await getTotalPage(page)

    let dataAllId = []

    for (let i = 1; i <= 1; i++) {
        await page.goto(`http://lib.kunci.or.id/index.php?page=${i}`)

        const data = await page.evaluate(() => {
            let arrData = []
            const mainItem = document.querySelectorAll('#left .item')

            mainItem.forEach(item => {
                arrData.push({
                    title: item.firstChild.innerHTML,
                    id: item.firstChild.getAttribute('href').split('=')[2],
                    isbn_issn: '',
                    authors: ''
                })
            })

            return arrData
        })

        dataAllId = dataAllId.concat(data)

        for (let i = 0; i < dataAllId.length; i++) {
            await page.goto(`http://lib.kunci.or.id/index.php?p=show_detail&id=${dataAllId[i].id}`)

            const dataDetail = await page.evaluate(() => {
                const mainItem = document.querySelectorAll('#left table tbody tr')
                let authors = []

                if (mainItem[5].querySelectorAll('.tblContent a')) {
                    const tempAuthors = mainItem[5].querySelectorAll('.tblContent a')
                    tempAuthors.forEach(item => {
                        authors.push(item.textContent)
                    })
                }

                return {
                    authors: authors.join(' - '),
                    isbn_issn: mainItem[3].querySelector('.tblContent') ? mainItem[3].querySelector('.tblContent').textContent : ''
                }
            })

            dataAllId[i].authors = dataDetail.authors
            dataAllId[i].isbn_issn = dataDetail.isbn_issn
        }
    }

    await browser.close()

    return dataAllId
}

async function getTotalPage(page) {
    const totalPage = await page.evaluate(() => {
        const hrefEl = document.querySelector('#left .pagingList a:last-child').getAttribute('href')
        const pageNumber = hrefEl.split('=')[1]
        return pageNumber
    })

    return totalPage
}

app.listen(3000, () => {
    console.log('server running on port 3000')
})