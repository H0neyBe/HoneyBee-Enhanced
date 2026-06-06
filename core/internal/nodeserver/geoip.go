package nodeserver

import (
	"fmt"
	"net"

	"github.com/oschwald/geoip2-golang"
)

// GeoData holds the geographical data for an IP.
type GeoData struct {
	CountryCode string  `json:"countryCode"`
	City        string  `json:"city"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
}

var (
	geoReader *geoip2.Reader
)

// InitGeoIP opens the MaxMind GeoIP database.
func InitGeoIP(dbPath string) error {
	var err error
	geoReader, err = geoip2.Open(dbPath)
	if err != nil {
		return fmt.Errorf("failed to open GeoIP database at %s: %w", dbPath, err)
	}
	return nil
}

// CloseGeoIP cleanly closes the GeoIP database.
func CloseGeoIP() {
	if geoReader != nil {
		geoReader.Close()
	}
}

// LookupIP fetches geographical coordinates and country for a given IP.
// It queries the local MaxMind database loaded in memory.
func LookupIP(ip string) GeoData {
	if ip == "" || ip == "127.0.0.1" || ip == "::1" || ip == "localhost" {
		return GeoData{}
	}

	if geoReader == nil {
		return GeoData{}
	}

	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return GeoData{}
	}

	record, err := geoReader.City(parsedIP)
	if err != nil {
		// Just return empty if not found
		return GeoData{}
	}

	var countryCode string
	if record.Country.IsoCode != "" {
		countryCode = record.Country.IsoCode
	}

	var city string
	if len(record.City.Names) > 0 {
		if enName, ok := record.City.Names["en"]; ok {
			city = enName
		}
	}

	return GeoData{
		CountryCode: countryCode,
		City:        city,
		Lat:         record.Location.Latitude,
		Lon:         record.Location.Longitude,
	}
}
