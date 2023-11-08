
import PropTypes from 'prop-types';
import { useEffect, useRef, useState, useCallback } from 'react';
import { version } from  '../package.json'
import styles from './MediaSlide.module.css'
import Slider from 'react-slider';
import * as React from 'react';

const listItemHTML = (click) => { 
    return (item) => { 
        return <li key={item.id} data-id={item.id} onClick={click(item)}><img src={item.tiny} width="32" /> {item.title}</li>
    }
}
const detailsItemHTML = (click) => { 
    return (item) => { 
        return <li key={item.id} data-id={item.id} onClick={click(item)}><img src={item.tiny} width="64" /> {item.title}</li>
    }
}
const thumbnailsItemHTML = (click,ts) => { 
    return (item) => { 
        return <li key={item.id} data-id={item.id} onClick={click(item)}><img src={item.thumb} width={ts} /><br />{item.title}</li>
    }
}
const slideItemHTML = (click,ts) => { 
    return (item) => { 
        // The 60 below is the number of pixels we reserve in the slide bar for the label
        return <li key={item.id} data-id={item.id} onClick={click(item)}><img src={item.thumb} height={ts-80} /><br />{item.title}</li>
    }
}

const MediaSlide = (props) => { 
    const {
        gallery,
        defaultDisplayType,
        loading,
        onLoadMoreData,
        renderFile,
        pagination,
        renderBigInfo
    } = props;
    const leftbarWidthRatio = 0.4;
    const {page, totalPages} = pagination;
    const [displayType, setDisplayType] = useState(defaultDisplayType || 'thumbnails');
    const [viewportHeight, setViewportHeight] = useState(100);
    const [thumbSize, setThumbSize] = useState(200);
    const [selectedItem, setSelectedItem] = useState(null);
    const [navbarHeight, setNavbarHeight] = useState(60);
    const [viewportWidth, setViewportWidth] = useState(100);
    const [leftbarWidth, setLeftbarWidth] = useState(0);
    const [leftbarOpen, setLeftbarOpen] = useState(false);
    const [leftbarOpened, setLeftbarOpened] = useState(false);
    const [defaultLeftbarWidth, setDefaultLeftbarWidth] = useState(0);
    const [currentLeftbarWidth, setCurrentLeftbarWidth] = useState(0);
    const [currentDoubleBuffer, setCurrentDoubleBuffer] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [lastElement, setLastElement] = useState(null);
    const [fileBuffer1, setFileBuffer1] = useState(null);
    const [fileBuffer2, setFileBuffer2] = useState(null);
    const [bigInfo, setBigInfo] = useState(null);
    
    const containerDiv = useRef();
    const portalDiv = useRef();
    const loadMoreRef = useRef();
    const doubleBuffer1 = useRef();
    const doubleBuffer2 = useRef();
    const fileDoubleBuffer1 = useRef();
    const fileDoubleBuffer2 = useRef();
    const sliderRef = useRef();
    const leftBar = useRef();
    const stageHeight = (isFullscreen?(viewportHeight-navbarHeight):(viewportHeight-navbarHeight)*0.75)
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
    const itemClick = (i, newDisplayType=null) => { 
        return (e) => { 
            if (!newDisplayType) newDisplayType=displayType;
            if (!i) return;
            
            if (selectedItem!=i || e.detail > 1 || e.detail < 1) { 
                if (selectedItem) { 
                    sliderRef.current.querySelector('li[data-id="'+selectedItem.id+'"]')?.classList?.remove(styles['mediaslide-item-selected'])
                }
                setSelectedItem(i);
                
                    renderBigInfo(i).then((buf) => { 
                        setBigInfo(buf);
                    })
                 
                let dt = newDisplayType;
                if (displayType!='slide' && e.detail > 1) { 
                    dt='slide';
                    setDisplayType('slide');
                    setCurrentLeftbarWidth(defaultLeftbarWidth)
                }
                if (dt!='slide' && !leftbarOpen && e.detail > 0) { 
                    setLeftbarWidth(defaultLeftbarWidth || 200);
                    setCurrentLeftbarWidth(defaultLeftbarWidth || 200);
                    setLeftbarWidth(defaultLeftbarWidth || 200);
                    setLeftbarOpen(true);
                    setLeftbarOpened(false);
                    
                } else if (dt=='slide' && leftbarOpen && e.detail > 0) { 
                    //setLeftbarWidth(0);
                    
                    setLeftbarOpened(true);
                    
                }
                sliderRef.current.querySelector('li[data-id="'+i.id+'"]')?.classList?.add(styles['mediaslide-item-selected'])
                if (dt == 'slide' || e.detail < 1) { 
                    setTimeout(()=>{
                        sliderRef.current.querySelector('li[data-id="'+i.id+'"]')?.scrollIntoView({behavior: 'smooth', block:'center', inline: 'center'}); 
                    },100);
                }
                if (dt=='slide' || e.detail > 1) {
                    flipDoubleBuffer(i,dt);
                }
                
            }
        }
    }

    const flipDoubleBuffer = (i, dt) => { 
        

        if (currentDoubleBuffer==1) { 
            const l = ()=> {  
                doubleBuffer1.current.style.opacity=1;
                doubleBuffer2.current.style.opacity=0;
                fileDoubleBuffer2.current.style.opacity=0;
                fileDoubleBuffer1.current.style.opacity=0;
                setCurrentDoubleBuffer(2);
                doubleBuffer1.current.removeEventListener('load',l);
            }
          
            const r = () => { 
                window.postMessage({request:'slideReady'},'*')
            }
            if (i.metadata.files && i.metadata.files.length>0 && i.metadata.files[0]?.mediaType?.substring(0,9)=='text/html') { 
                const messageHandler=(e) => { 
                    if (e.data.request=='slideReady') { 
                        fileDoubleBuffer1.current.style.opacity=1;
                        fileDoubleBuffer2.current.style.opacity=0;
                        doubleBuffer2.current.style.opacity=0;
                        doubleBuffer1.current.style.opacity=0;
                        setCurrentDoubleBuffer(2);
                        fileDoubleBuffer2.current.style.filter='none'
                        window.removeEventListener('message',messageHandler);
                    }
                }
                
                fileDoubleBuffer2.current.style.filter='blur(7px) brightness(70%)'
                fileDoubleBuffer2.current.style.zIndex=1;
                fileDoubleBuffer1.current.style.zIndex=2;
                window.addEventListener('message', messageHandler);
                renderFile(i,r,'100%',stageHeight).then((buf) => { 
                    setFileBuffer1(buf);
                })   
            } else { 
                doubleBuffer1.current.addEventListener('load',l);
                doubleBuffer1.current.src=i.full;
            }
        } else {
            const l = ()=> {
                doubleBuffer2.current.style.opacity=1;
                doubleBuffer1.current.style.opacity=0;
                fileDoubleBuffer1.current.style.opacity=0;
                fileDoubleBuffer2.current.style.opacity=0;
                setCurrentDoubleBuffer(1);
                doubleBuffer2.current.removeEventListener('load', l);
            }

            const r = () => { 
                window.postMessage({request:'slideReady'},'*')
            }
            if (i.metadata.files && i.metadata.files.length>0 && i.metadata.files[0]?.mediaType?.substring(0,9)=='text/html') { 
                const messageHandler=(e)=>{ 
                    if (e.data.request=='slideReady') { 
                        fileDoubleBuffer2.current.style.opacity=1;
                        fileDoubleBuffer1.current.style.opacity=0;
                        doubleBuffer1.current.style.opacity=0;
                        doubleBuffer2.current.style.opacity=0;
                        setCurrentDoubleBuffer(1);
                        fileDoubleBuffer1.current.style.filter='none'
                        window.removeEventListener('message',messageHandler)
                    }
                }
                fileDoubleBuffer1.current.style.filter='blur(7px) brightness(70%)'
                fileDoubleBuffer2.current.style.zIndex=2;
                fileDoubleBuffer1.current.style.zIndex=1;
                window.addEventListener('message',messageHandler);
                renderFile(i,r,'100%',stageHeight).then((buf)=> { 
                    setFileBuffer2(buf);
                })
            } else { 
                doubleBuffer2.current.addEventListener('load', l);
                doubleBuffer2.current.src=i.full;
            }
            
        }
    }
    if (gallery) { 
        if (gallery.length<1) { 
            items=<h1>Not found</h1>
        } else { 
            let lElement;
            if (page<totalPages){
                lElement=<li ref={loadMoreRef}>Loading...</li>
            }
            items = <ul ref={sliderRef} className={styles['mediaslide-'+displayType+'-ul']}>{gallery.map(itemHTML(itemClick, useThumbSize))}{lElement}</ul>
        }
    } else { 
        items = <h1>Loading</h1>
    }
    
    useEffect(() => {
        
        const intersectionObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
              async function fetchMorePosts() {
                if (page<totalPages) { 
                    onLoadMoreData(pagination);
                }
              }
              fetchMorePosts();
            }
          });
          if (loadMoreRef.current) { 
            intersectionObserver.observe(loadMoreRef.current);
          }
        return () => { 
            intersectionObserver.disconnect();
        }
    },[loadMoreRef.current, gallery, page, totalPages, loading]);
    useEffect(()=> { 
        const resizeObserver = new ResizeObserver((event) => {
            setViewportWidth(event[0].contentBoxSize[0].inlineSize);
            setViewportHeight(event[0].contentBoxSize[0].blockSize);
            setDefaultLeftbarWidth(event[0].contentBoxSize[0].inlineSize * leftbarWidthRatio);
            setLeftbarWidth(event[0].contentBoxSize[0].inlineSize * leftbarWidthRatio);
        });
        resizeObserver.observe(containerDiv.current);
        
        return () => { 
            resizeObserver.disconnect();
            
        }
    },[])
    useEffect(() => { 
        const listener = keyDown(sliderRef, displayType);
        window.addEventListener('keydown', listener)
        return () => { 
            window.removeEventListener('keydown', listener);
        }
    },[displayType]);

    const displayTypeChange = (e) => { 
        setDisplayType(e.target.value);
        if (e.target.value!='slide') { 
            setFileBuffer1('');
            setFileBuffer2('');
            let delay = 10;
            let clickNum = 0;
            if (leftbarOpen && leftbarWidth==0) { 
                delay=400;
                clickNum = 0;
                ;
                setBigInfo('')
                setLeftbarWidth(defaultLeftbarWidth)
                console.log(1);
            } else if (leftbarOpen) { 
                console.log(2);
                setCurrentLeftbarWidth(defaultLeftbarWidth);
                setLeftbarWidth(defaultLeftbarWidth)
            }
            
            
            setTimeout(() => { 
                
                itemClick(selectedItem, e.target.value)({detail:clickNum});
            },delay);
        } else { 
            
            setCurrentLeftbarWidth(0)
            setLeftbarWidth(defaultLeftbarWidth);
            
            
            setTimeout(() => { 
                
                itemClick(selectedItem, e.target.value)({detail:0});
            },10);
        }
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
        if (displayType!='slide' && displayType!='list') return;
        const container = portalDiv.current;
        const scrollAmount = e.deltaY/1.5;
        container.scrollTo({
          top: 0,
          left: container.scrollLeft + scrollAmount,
          behavior: 'instant'
        });
    }
    const previous = (sRef, displayType) => { 
        sRef.current.querySelector('.'+styles['mediaslide-item-selected'])?.previousElementSibling.click();
    }
    const next = (sRef, displayType) => { 
        sRef.current.querySelector('.'+styles['mediaslide-item-selected'])?.nextElementSibling.click();
    }
    const keyDown = (sRef) => { 
        return (e) => { 
            switch (e.key) { 
                case 'ArrowLeft':
                    previous(sRef);
                break;
                case 'ArrowRight': 
                    next(sRef);
                break;
            }
            e.preventDefault();
        }
    }
    console.log(leftbarOpened)
    console.log(leftbarWidth, currentLeftbarWidth, defaultLeftbarWidth)
    return (
        <div className={styles['mediaslide-container']} ref={containerDiv}>
        <div className={styles['mediaslide-leftbar']+(leftbarOpened?' '+styles['mediaslide-leftbar-opened']:'')} ref={leftBar} style={{width: leftbarWidth, left:-(leftbarWidth-currentLeftbarWidth)}}>
            {bigInfo}
        </div>
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
            <section className={styles['mediaslide-slide-stage']} style={{height:displayType=='slide'?stageHeight:0, opacity:displayType=='slide'?'1':'0'}}>
            <div className={styles['mediaslide-double-buffer-container']} style={{opacity: '1'}}>
                <img className={styles['mediaslide-double-buffer']} style={{opacity:0}} src="" ref={doubleBuffer1} height={displayType=='slide'?stageHeight:0} />
                <img className={styles['mediaslide-double-buffer']} style={{opacity:0}} src="" ref={doubleBuffer2} height={displayType=='slide'?stageHeight:0} />
                <div className={styles['mediaslide-double-buffer']} style={{opacity:0, height:displayType=='slide'?stageHeight:0, width: viewportWidth}} src="" ref={fileDoubleBuffer1}>{fileBuffer1}</div>
                <div className={styles['mediaslide-double-buffer']} style={{opacity:0, height:displayType=='slide'?stageHeight:0, width: viewportWidth}} src="" ref={fileDoubleBuffer2}>{fileBuffer2}</div>
            </div>
            </section>
            
            <section ref={portalDiv} className={styles['mediaslide-portal']} style={{width: viewportWidth-currentLeftbarWidth, left:currentLeftbarWidth, height: displayType=='slide'?(viewportHeight-navbarHeight)*0.25:viewportHeight-navbarHeight}} onWheel={slideScroll}>
            {items}
            </section>
            
        </div>
        </div>
    );
}

MediaSlide.propTypes = {
   gallery: PropTypes.array.isRequired,
   loading: PropTypes.bool.isRequired,
   defaultDisplayType: PropTypes.string,
   onLoadMoreData: PropTypes.func.isRequired,
   pagination: PropTypes.object.isRequired,
   renderFile: PropTypes.func.isRequired,
   renderBigInfo: PropTypes.func.isRequired
};
export default MediaSlide;