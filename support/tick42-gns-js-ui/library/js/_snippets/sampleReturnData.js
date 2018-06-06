/**
 * > sample data used by test.js
 * > this is the likely structure of objects
 * as they arrive from the DM via the agm stream
 */

var categoryNews = {
    "glueRouting": {
        "actions": {
            "items": {
                "0": {
                    "description": "Sends an email after several minutes delay",
                    "image": "EmailIcon",
                    "name": "T42.GNS.Email",
                    "parameters": {
                        "0": {
                            "name": "delay",
                            "value": {
                                "intValue": 7
                            }
                        }
                    }
                },
                "1": {
                    "description": "Opens or brings to focus the NewsFeed window.",
                    "name": "T42.GNS.News.OpenGenericNewsFeed"
                }
            },
            "path": "/Actions/News"
        },
        "popupMethod": {
            "name": "T42.GNS.News.AgmPopup",
            "parameters": {
                "0": {
                    "name": "toastText",
                    "value": {
                        "stringValue": "A News item has arrived!"
                    }
                }
            }
        }
    },
    "name": "News",
    "resources": {
        "images": {
            "0": {
                "data": "url/pointing/to/GenericNewsItem.png",
                "format": "url",
                "name": "newsImage"
            },
            "1": {
                "data": "url/pointing/to/envelope.jpg",
                "format": "url",
                "name": "EmailIcon"
            }
        }
    }
}

var categoryNewsRSS = {
    "glueRouting": {
        "actions": {
            "items": {
                "0": {
                    "description": "Sends the notification details using the configured email service",
                    "name": "T42.GNS.Email",
                    "parameters": {
                        "0": {
                            "name": "priority",
                            "value": {
                                "stringValue": "$(severity)"
                            }
                        },
                        "1": {
                            "name": "recepients",
                            "value": {
                                "stringValues": ["test@mail.com", "test2@mail.com", "test3@mail.com"]
                            }
                        }
                    }
                },
                "1": {
                    "name": "T42.GNS.News.RSS.Reset"
                }
            },
            "path": "/Actions/Rss"
        },
        "detailMethod": {
            "name": "T42.GNS.News.Rss.DetailsView",
            "parameters": {
                "0": {
                    "name": "notification",
                    "value": {
                        "stringValue": "$(this)"
                    }
                }
            }
        },
        "handlerMethod": {},
        "popupMethod": {
            "name": "T42.GNS.News.Rss.AgmPopup",
            "parameters": {
                "0": {
                    "name": "displayTitle",
                    "value": {
                        "stringValue": "$(title)"
                    }
                }
            }
        }
    },
    "name": "News/RSS",
    "resources": {
        "images": {
            "0": {
                "data": "url/pointing/to/RssIcon.png",
                "format": "url",
                "name": "newsImage"
            }
        }
    }
}

/**
 * > this array would have to be generated by the UI
 * > it does not come from the DM
 */
var sampleCategories = [categoryNewsRSS, categoryNews]

var sourceEikon = {
    "glueRouting": {
        "actions": {
            "items": {
                "0": {
                    "image": "EikonIcon",
                    "name": "T42.GNS.Eikon.CloseSource"
                }
            },
            "path": "/Actions/Eikon"
        }
    },
    "name": "Eikon",
    "resources": {
        "images": {
            "0": {
                "data": "url/pointing/to/resource",
                "format": "url",
                "name": "EikonIcon",
                "resourceType": "image"
            }
        }
    }
}

var sampleNotification = {
    "attributes": {
        "0": {
            "key": "bool",
            "value": {
                "boolValue": true
            }
        },
        "1": {
            "key": "int",
            "value": {
                "intValue": 7
            }
        },
        "2": {
            "key": "long",
            "value": {
                "longValue": 95
            }
        },
        "3": {
            "key": "double",
            "value": {
                "doubleValue": 55.689
            }
        },
        "4": {
            "key": "dateTime",
            "value": {
                "dateTimeValue": "2015-11-07T14:28:25.107Z"
            }
        },
        "5": {
            "key": "string",
            "value": {
                "stringValue": "lorem ipsum"
            }
        },
        "6": {
            "key": "arr bool",
            "value": {
                "boolValues": [true, false, false, true]
            }
        },
        "7": {
            "key": "arr int",
            "value": {
                "intValues": [88, 90, 4, -9, 0]
            }
        },
        "8": {
            "key": "arr long",
            "value": {
                "longValues": [-8908, 790, 0, -53990, 1]
            }
        },
        "9": {
            "key": "arr double",
            "value": {
                "doubleValues": [123089.12809, -980123, 8809.12, 0]
            }
        },
        "10": {
            "key": "arr dateTime",
            "value": {
                "dateTimeValues": ["2003-01-05T21:32:44.945Z", "2003-01-05T16:00:44.945Z", "2015-12-03T07:09:16.856Z"]
            }
        },
        "11": {
            "key": "arr string",
            "value": {
                "stringValues": ["will", "learn more", "about powerful search", "values", "in", "the"]
            }
        }
    },
    "category": "News/RSS",
    "creationTime": "2016-01-12T10:28:25.107Z",
    "description": "Gimonara ci her tapeffab tiffajzi saroco pe rotket.",
    "glueRouting": {
        "actions": {
            "items": {
                "0": {
                    "description": "Sends the notification details using the configured email service",
                    "image": "EikonIcon",
                    "name": "T42.GNS.Email",
                    "parameters": {
                        "0": {
                            "name": "priority",
                            "value": {
                                "stringValue": "$(severity)"
                            }
                        },
                        "1": {
                            "name": "recepients",
                            "value": {
                                "stringValues": ["test@mail.com", "test2@mail.com", "test3@mail.com"]
                            }
                        }
                    }
                },
                "1": {
                    "description": "Opens the news feed without bringing it to focus",
                    "name": "T42.GNS.News.OpenGenericNewsFeed",
                    "parameters": {
                        "0": {
                            "name": "toFocus",
                            "value": {
                                "boolValue": false
                            }
                        }
                    }
                },
                "2": {
                    "description": "Passes the title into a translation tool",
                    "name": "T42.GNS.Translate",
                    "parameters": {
                        "0": {
                            "name": "sourceText",
                            "value": {
                                "stringValue": "$(title)"
                            }
                        }
                    }
                }
            },
            "path": "/Actions/Rss"
        },
        "detailMethod": {
            "name": "T42.GNS.Custom.NotificationViewer",
            "parameters": {
                "0": {
                    "name": "notification",
                    "value": {
                        "stringValue": "$(this)"
                    }
                }
            }
        }
    },
    "id": "1a1bd623-082f-4ef2-92d9-9fe4697715f9",
    "isRead": false,
    "lifetime": {
        "expiresIn": 43594
    },
    "notificationTime": "3035-01-12T10:28:25.107Z",
    "revision": 0,
    "severity": "Info",
    "source": "Eikon",
    "sourceNotificationId": "BPMEngine_cihqc81w30001s8ip0juf7ivf",
    "state": "Closed",
    "target": {
        "groups": ["Newfoundland and Labrador"]
    },
    "title": "Uhium biaziti mu ceknoig weeb za.",
    "type": "Workflow"
}