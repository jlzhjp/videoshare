const fs = require('fs')
const process = require('process')
const nunjucks = require('nunjucks')
const express = require('express')
const path = require('path')

const app = express()
const VIDEOS_PATH = process.argv[2]

const getSeriesInfo = () =>
  fs.readdirSync(VIDEOS_PATH, { withFileTypes: true })
    .filter(dir => dir.isDirectory())
    .map(dir => dir.name)
    .map(name => ({
      name,
      cover: fs.existsSync(path.join(VIDEOS_PATH, name, 'cover.png'))
        ? path.join('/videos', name, 'cover.png') : '/img/akari.jpg',
      watch_href: encodeURI(`/watch?name=${encodeURIComponent(name)}`)
    }))

const getEpisodeInfo = (seriesName) => {
  const SERIES_PATH = path.join(VIDEOS_PATH, seriesName)
  if (!fs.existsSync(SERIES_PATH)) {
    throw Error('No such series')
  }
  return fs.readdirSync(SERIES_PATH, { withFileTypes: true })
    .filter(f => f.isDirectory())
    .map(f => f.name)
    .map(seasonName => ({
      name: seasonName,
      episodes: fs.readdirSync(path.join(SERIES_PATH, seasonName))
        .filter(n => /.*.mp4/)
        .map(n => /^\[(.+)\](.*).mp4$/.exec(n))
        .map(m => ({
          number: parseInt(m[1]),
          title: m[2],
          source: encodeURI(`/videos/${seriesName}/${seasonName}/${m.input}`)
        }))
        .sort((x, y) => x.number - y.number)
    }))
}

nunjucks.configure(path.join(__dirname, 'views'), {
  autoescape: true,
  watch: true,
  express: app
})

app.set('view engine', 'njk')
app.use(express.static(path.join(__dirname, 'public')))
app.use('/videos', express.static(VIDEOS_PATH))

app.get('/', (req, res) => {
  res.render('index', { data: getSeriesInfo() })
})
app.get('/watch', (req, res) => {
  const NAME = decodeURIComponent(req.query.name)
  res.render('watch', { name: NAME, data: getEpisodeInfo(NAME) })
})

app.listen(8080, () => {
  console.log('Listening on 8080...')
})
