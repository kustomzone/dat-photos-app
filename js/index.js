(async  function () {
  const SHARED_CSS = ['css/buttons.css', 'css/header.css', 'css/base.css', 'css/prompt.css']
  const ALBUM_CSS = ['css/album.css']

  // render prompt if not using Beaker
  if (!navigator.userAgent.includes('BeakerBrowser')) {
    renderUAPrompt()
    return
  }

  // setup
  let archive, archiveInfo, albums
  let selectedImages = []

  const shareBtn = document.getElementById('share-btn')
  // shareBtn.addEventListener('click', onShare)

  try {
    archive = new DatArchive(window.location)
    archiveInfo = await archive.getInfo()
    albums = JSON.parse(await archive.readFile('albums.json'))
  } catch (err) {
    updatePrompt('<p>Something went wrong.</p><a href="https://github.com/taravancil/p2p-photo-gallery">Report an issue</a>')
  }

  // render fork prompt if user is not owner
  if (!archiveInfo.isOwner) {
    renderForkPrompt()
    document.getElementById('fork-button').addEventListener('click', onForkApp)
    return
  }

  renderApp()

  // events

  async function onForkApp () {
    // Wait for the archive's files to download
    // TODO handle timeout
    await archive.download('/')

    // Fork the app and open the forked version
    myApp = await DatArchive.fork(archive, {title: 'My Photos'})
    window.location = myApp.url
  }

  async function onCreateAlbum (e) {
    // create a new Dat archive
    const album = await DatArchive.create()
    const info = await album.getInfo()

    // create the /images and /css directories
    await album.mkdir('/images')
    await album.mkdir('/css')

    // write the albums URL to albums.json
    albums.push(album.url)
    await archive.writeFile('albums.json', JSON.stringify(albums))

    const html = await archive.readFile('album.html')
    const js = await archive.readFile('/js/album.js')

    const cssFiles = SHARED_CSS.concat(ALBUM_CSS)
    console.log(cssFiles)
    for (let i = 0; i < cssFiles.length; i++) {
      const css = await archive.readFile(cssFiles[i])
      await album.writeFile(cssFiles[i], css)
    }

    // write the album's assets
    await album.writeFile('index.html', html)
    await album.writeFile('index.js', js)
    await album.commit()

    // go to the new archive
    window.location = album.url
  }

  async function onDeleteSelected () {
    for (let i = 0; i < selectedImages.length; i++) {
      const path = selectedImages[i]

      // remove from DOM
      document.querySelector(`[src='${path}']`).remove()

      // remove from archive
      await archive.unlink(selectedImages[i], 'binary')
    }
    await archive.commit()

    // disable share button, since all selected photos were deleted
    shareBtn.disabled = true
  }

  // renderers

  function renderApp () {
    // clear the prompt
    updatePrompt('')

    document.querySelectorAll('.create-album').forEach(el => el.addEventListener('click', onCreateAlbum))

    renderAlbums()
  }

  function renderAlbums () {
    for (let i = 0; i < albums.length; i++) {
      appendAlbum(new DatArchive(albums[i]))
    }
  }

  async function appendAlbum (album) {
    const info = await album.getInfo()
    let albumHTML = ''

    // get the count of images in the album
    const images = await album.readdir('/images')

    // create the album element
    const el = document.createElement('a')
    el.classList.add('album')
    el.href = album.url

    if (!images.length) {
      el.classList.add('empty')
      albumHTML += '<div class="placeholder">No photos</div>'
    } else {
      // add the first image to the album preview
      albumHTML += `<img src="${album.url}/images/${images[0]}"/>`
    }

    // add the title
    albumHTML += `<div class="title">${info.title || '<em>Untitled</em>'}</div>`

    // add the image count to the HTML
    albumHTML += `<div class="photo-count">${images.length} photos</div>`

    el.innerHTML = albumHTML

    document.querySelector('.albums-container').appendChild(el)
  }

  function renderUAPrompt () {
    updatePrompt('<p>Sorry >.< This app only works in the Beaker Browser.</p><a class="btn primary" href="https://beakerbrowser.com/docs/install/">Install Beaker</a>')
  }

  function renderForkPrompt () {
    updatePrompt('<p>Welcome to Photos!</p><button id="fork-button" class="btn primary">Get started</button>')
  }

  // helpers

  function updatePrompt (html) {
    if (typeof html !== 'string') return
    if (html.length) {
      document.querySelector('#prompt').innerHTML = `<div class="content">${html}</div>`
    } else {
      document.querySelector('#prompt').innerHTML = html
    }
  }
})()