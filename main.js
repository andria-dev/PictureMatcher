const facebookCode = `function loadAll(counter=0) {
  if ( window.scrollY < Number(getComputedStyle( document.body ).height.slice(0,-2)) - window.innerHeight ) {
    window.scrollBy(0,1000)
    counter = 0
  }
  if ( counter < 10 ) {
    setTimeout( () => loadAll( counter+1 ), 500 )
  } else {
    const copy = document.createElement('button')
    copy.innerText = 'Copy URLs'
    copy.style.position = 'fixed'
    copy.style.left = '50%'
    copy.style.top = '50%'
    copy.style.transform = 'translate(-50%,-50%)'
    copy.style.padding = '1rem 2rem'
    copy.style.fontFamily = 'Roboto, Arial, sans-serif'
    copy.style.fontSize = '1.25rem'
    copy.style.color = 'white'
    copy.style.backgroundColor = '#3498db'
    copy.style.border = '0'
    copy.style.borderRadius = '0.05rem'
    copy.style.boxShadow = '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)'
    copy.style.cursor = 'pointer'
    copy.addEventListener('click', () => {
      const urls = Array.from(document.querySelectorAll('ul > li > div > a > img')).map(el=>el.src).join(','),
            textarea = document.createElement('textarea')
      textarea.value = urls
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const result = document.execCommand('copy')
      if ( ( !result && !confirm( \`Couldn't copy, try again?\` ) ) || result ) {
        document.body.removeChild(textarea)
        document.body.removeChild(copy)
        
        const form = document.createElement( 'div' ),
              label = document.createElement( 'label' ),
              input = document.createElement( 'input' ),
              button = document.createElement( 'button' )
        
        form.style.position = 'fixed'
        form.style.left = '50%'
        form.style.top = '50%'
        form.style.transform = 'translate(-50%,-50%)'
        form.style.backgroundColor = '#fafafa'
        form.style.boxShadow = '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)'
        form.style.borderRadius = '0.05rem'
        form.style.display = 'flex'
        form.style.flexDirection = 'column'
        form.style.alignItems = 'center'
        form.style.padding = '1rem 2rem'
        
        label.style.fontFamily = 'Roboto'
        label.style.color = '#222'
        label.style.fontSize = '1rem'
        label.style.textAlign = 'left'
        label.style.width = '100%'
        label.innerText = 'Enter the URL of the picture you found:'
        
        input.style.backgroundColor = 'white'
        input.style.width = '75vw'
        input.style.maxWidth = '20rem'
        input.style.padding = '1rem'
        input.style.fontSize = '0.8rem'
        input.setAttribute( 'placeHolder', 'https://example.com' )
        
        button.style.backgroundColor = '#3498db'
        button.style.color = 'white'
        button.style.borderRadius = '0.05rem'
        button.style.width = '100%'
        button.style.padding = '0.5rem 0'
        button.style.border = 'none'
        button.style.margin = '0.5rem 0.5rem 0'
        button.style.cursor = 'pointer'
        button.style.fontFamily = 'Roboto'
        button.style.fontSize = '0.9rem'
        button.style.fontWeight = '700'
        button.innerText = 'SUBMIT'
        
        button.addEventListener( 'click', () => {
          const success = getProfileFromURL( input.value )
          
          input.value = ''
          
          if ( ( !success && !confirm( 'There are no profile pictures that match this url, would you like to try again?' ) ) || success ) {
            document.body.removeChild( form )
          }
        })
        
        form.appendChild( label )
        form.appendChild( input )
        form.appendChild( button )
        document.body.appendChild( form )
      }
    })
    document.body.appendChild(copy)
  }
}

function getProfileFromURL( url ) {
  const match = Array.from(document.querySelectorAll('ul > li > div > a > img'))
    .reduce( ( match, next ) => next.src === url ? next : match, null )
  
  if ( match === null )
    return false
  
  match.parentElement.click()
  return true
}

loadAll()`

let comparingPictures = false

resemble.comparePromise = function (image1, image2, options) {
  return new Promise(function(resolve, reject) {
    resemble.compare(image1, image2, options, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

function updatePreview() {
  const url = window.URL.createObjectURL( mainImage.files[0] )
  preview.src = url
  mainImage.classList.add( 'valid' )
}

async function comparePictures() {
  if ( mainImage.files.length < 1 || comparingPictures )
    return
  
  comparingPictures = true
  activateOverlay( '.spinner' )
  
  const options = {
          scaleToSameSize: true,
          ignore: 'antialiasing'
        },
        urls = urlsToCompare.value.split(','),
        blobPromises = await urls.map( async ( url, index ) => {
          const xhr = await fetch( url, { method: 'GET' } ).catch( err => console.error( err ) )
          return xhr.blob()
        })
  
  Promise.all( blobPromises )
    .then( blobs => {
      const comparisonResultPromises = blobs.map( ( blob, index ) => {
          blob.lastModifiedDate = new Date()
          blob.name = index.toString()
          return resemble.comparePromise( mainImage.files[ 0 ], blob, options )
        })
      
      Promise.all( comparisonResultPromises )
        .then( comparisonResults => {
          const closestMatchResults = comparisonResults
                  .map( comparison => comparison.rawMisMatchPercentage )
                  .reduce( ( bestValue, nextValue, index ) => bestValue.value <= nextValue ? bestValue : { value: nextValue, index: index }, { value: Infinity, index: -1 } )
          
          imageMatch.src = URL.createObjectURL( blobs[ closestMatchResults.index ] )
          imageMatchText.innerText = `Here's the closest match!`
          imageMatchText.href = urls[ closestMatchResults.index ]
          
          comparingPictures = false
          deactivateOverlay()
        })
        .catch( err => console.error ( err ) )
    })
    .catch( err => console.error( err ) )
}

function activateOverlay( selector ) {
  const el = document.querySelector( selector )
  if ( !el )
    return false
  
  deactivateOverlay()
  document.body.removeChild( mui.overlay( 'on' ) )
  el.id = 'mui-overlay'
  return true
}

function deactivateOverlay() {
  const overlay = document.getElementById( 'mui-overlay' )
  
  if ( !overlay )
    return false
  
  overlay.id = ''
  mui.overlay( 'off' )
  return true
}

function copyToClipboard( text ) {
  const textarea = document.createElement( 'textarea' )
  
  // Add content and style to textarea
  textarea.innerHTML = text
  textarea.style.position = 'absolute'
  textarea.style.opacity = '0'
  
  // Add to body and select
  document.body.appendChild( textarea )
  textarea.select()
  
  // Copy
  document.execCommand( 'copy' )
  document.body.removeChild( textarea )
}

function main() {
  openInfoButton.addEventListener( 'click', () => activateOverlay( '.info' ) )
  copyCodeButton.addEventListener( 'click', () => copyToClipboard( facebookCode ) )
  closeInfoButton.addEventListener( 'click', () => deactivateOverlay() )
  fileButton.addEventListener( 'click', () => mainImage.click() )
  mainImage.addEventListener( 'change', updatePreview )
  compare.addEventListener( 'click', comparePictures )
}

document.addEventListener( 'DOMContentLoaded', main )