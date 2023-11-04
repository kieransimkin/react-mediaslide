
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { version } from  '../package.json'
import styles from './MediaSlide.module.css'
import Slider from 'react-slider';
import * as React from 'react';

const listItemHTML = (click) => { 
    return (item) => { 
        return <li onClick={click(item)}><img src={item.tiny} width="32" /> {item.title}</li>
    }
}
const detailsItemHTML = (click) => { 
    return (item) => { 
        return <li onClick={click(item)}><img src={item.tiny} width="64" /> {item.title}</li>
    }
}
const thumbnailsItemHTML = (click,ts) => { 
    return (item) => { 
        return <li onClick={click(item)}><img src={item.thumb} width={ts} /><br />{item.title}</li>
    }
}
const slideItemHTML = (click,ts) => { 
    return (item) => { 
        // The 60 below is the number of pixels we reserve in the slide bar for the label
        return <li onClick={click(item)}><img src={item.thumb} height={ts-60} /><br />{item.title}</li>
    }
}

const MediaSlide = (props) => { 
    const {
        gallery,
        defaultDisplayType
    } = props;

    const [displayType, setDisplayType] = useState(defaultDisplayType || 'thumbnails');
    const [viewportHeight, setViewportHeight] = useState(100);
    const [thumbSize, setThumbSize] = useState(200);
    const [selectedItem, setSelectedItem] = useState(null);
    const [navbarHeight, setNavbarHeight] = useState(60);
    const [viewportWidth, setViewportWidth] = useState(100);
    const [currentDoubleBuffer, setCurrentDoubleBuffer] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerDiv = useRef();
    const portalDiv = useRef();
    const loadMoreRef = useRef();
    const doubleBuffer1 = useRef();
    const doubleBuffer2 = useRef();
    const stageHeight = displayType=='slide'?(isFullscreen?(viewportHeight-navbarHeight):(viewportHeight-navbarHeight)*0.75):0;
    let items, itemHTML;
    let useThumbSize = thumbSize;

    switch (displayType) { 
        case 'list': 
            itemHTML=listItemHTML;
            break;
        case 'details':
            itemHTML=detailsItemHTML;
            break;
        case 'thumbnails':
            itemHTML=thumbnailsItemHTML;
            break;
        case 'slide': 
            itemHTML=slideItemHTML;
            useThumbSize=(viewportHeight-navbarHeight)*0.25;
            break;
    }
    const itemClick = (i) => { 
        return (e) => { 
            if (selectedItem!=i) { 
                setSelectedItem(i);
                if (displayType!='slide') { 
                    setDisplayType('slide');
                } 
                
                flipDoubleBuffer(i);
            }
        }
    }
    useEffect(() => { 

    },[selectedItem]);
    const flipDoubleBuffer = (i) => { 
        if (currentDoubleBuffer==1) { 
            const l = ()=> {  
                doubleBuffer1.current.style.opacity=1;
                doubleBuffer2.current.style.opacity=0;
                setCurrentDoubleBuffer(2);
                doubleBuffer1.current.removeEventListener('load',l);
            }
            doubleBuffer1.current.addEventListener('load',l);
            doubleBuffer1.current.src=i.full;
            
        } else { 
            const l = ()=> {
                doubleBuffer2.current.style.opacity=1;
                doubleBuffer1.current.style.opacity=0;
                setCurrentDoubleBuffer(1);
                doubleBuffer2.current.removeEventListener('load', l);
            }
            doubleBuffer2.current.addEventListener('load', l);
            doubleBuffer2.current.src=i.full;
            
        }
        
        console.log(i.full);
    }
    if (gallery) { 
        if (gallery.length<1) { 
            items=<h1>Not found</h1>
        } else { 
            items = <ul className={styles['mediaslide-'+displayType+'-ul']}>{gallery.map(itemHTML(itemClick, useThumbSize))}<li ref={loadMoreRef}>Loading...</li></ul>
        }
    } else { 
        items = <h1>Loading</h1>
    }
    
    useEffect(() => {
        const resizeObserver = new ResizeObserver((event) => {
            setViewportWidth(event[0].contentBoxSize[0].inlineSize);
            setViewportHeight(event[0].contentBoxSize[0].blockSize);
        });
        resizeObserver.observe(containerDiv.current);
        return () => { 
            resizeObserver.disconnect();
        }
    },[]);

    const displayTypeChange = (e) => { 
        setDisplayType(e.target.value)
    }
    const thumbSizeSlide = (s) => { 
        setThumbSize(s);
        if (displayType!='thumbnails') { 
            setDisplayType('thumbnails');
        }
    }
    const toggleFullscreen = () => { 
        if (displayType!='slide') { 
            setDisplayType('slide');
        }
        if (isFullscreen) { 
            setIsFullscreen(false);
        } else { 
            setIsFullscreen(true);
        }
    }
    const slideScroll = (e) => { 
        if (displayType!='slide') return;
        const container = portalDiv.current;
        const scrollAmount = e.deltaY/2;
        //container.style.transform='translateX('+(container.scrollLeft + scrollAmount)+'px)';
        //return;
        container.scrollTo({
          top: 0,
          left: container.scrollLeft + scrollAmount,
          behavior: 'instant'
        });
    }
    return (
        <div className={styles['mediaslide-container']} ref={containerDiv}>
        
        <div className={styles.mediaslide+' '+styles['mediaslide-'+displayType]} style={{height: viewportHeight}}>
            <nav className={styles['mediaslide-nav']} style={{height: navbarHeight}}>
                <label className={styles['mediaslide-nav-displaytype']}><input type="radio" name="displayType" value="list" onChange={displayTypeChange} checked={displayType=='list'} />List</label>
                <label className={styles['mediaslide-nav-displaytype']}><input type="radio" name="displayType" value="details" onChange={displayTypeChange} checked={displayType=='details'} />Details</label>
                <label className={styles['mediaslide-nav-displaytype']}><input type="radio" name="displayType" value="thumbnails" onChange={displayTypeChange} checked={displayType=='thumbnails'} />Thumbnails<br />
                <div className={styles['mediaslide-slider-opacity']} style={{opacity:displayType=='thumbnails'?'1':'0.2'}}>
                    <Slider min={100} max={700} value={thumbSize}
                        onChange={thumbSizeSlide}
                        className={styles['mediaslide-slider']}
                        thumbClassName={styles['mediaslide-slider-thumb']}
                        trackClassName={styles['mediaslide-slider-track']}
                    />
                </div>
                </label>
                <label className={styles['mediaslide-nav-displaytype']}><input type="radio" name="displayType" value="slide" onChange={displayTypeChange} checked={displayType=='slide'} />Slide<br />
                <div className={styles['mediaslide-transport-opacity']} style={{opacity:displayType=='slide'?'1':'0.2'}}>

                    <button onClick={toggleFullscreen} className={styles[isFullscreen?'mediaslide-transport-fullscreen-active':'mediaslide-transport-fullscreen']}>&nbsp;</button>
                    <button className={styles['mediaslide-transport-start']}>⏮</button>
                    <button className={styles['mediaslide-transport-rewind']}>⏪︎</button>
                    <button className={styles['mediaslide-transport-stop']}>⏹︎</button>
                    <button className={styles['mediaslide-transport-play']}>⏵︎</button>
                    <button className={styles['mediaslide-transport-forward']}>⏩︎</button>
                    <button className={styles['mediaslide-transport-end']}>⏭</button>
                </div>
                </label>
            </nav>
            <section className={styles['mediaslide-slide-stage']} style={{height:stageHeight}}>
            <div className={styles['mediaslide-double-buffer-container']}>
                <img className={styles['mediaslide-double-buffer']} style={{opacity:0}} src="" ref={doubleBuffer1} height={stageHeight} />
                <img className={styles['mediaslide-double-buffer']} style={{opacity:0}} src="" ref={doubleBuffer2} height={stageHeight} />
            </div>
            </section>
            <section ref={portalDiv} className={styles['mediaslide-portal']} style={{height: displayType=='slide'?(viewportHeight-navbarHeight)*0.25:viewportHeight-navbarHeight}} onWheel={slideScroll}>
            {items}
            </section>
        </div>
        </div>
    );
}

MediaSlide.propTypes = {
   gallery: PropTypes.array.isRequired,
   defaultDisplayType: PropTypes.string
};
export default MediaSlide;