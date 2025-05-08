import axios from 'axios';

export default async function handler(req, res) {
  try {
    res.setHeader('Content-Type', 'application/json; charset=UTF-8');

    const rawNumbers = req.query.number;
    if (!rawNumbers) {
      return res.status(400).json({ error: "Missing 'number' parameter." });
    }

    const numbers = rawNumbers.split(',').map(n => n.trim()).filter(Boolean);
    const country = 'BD';

    const headers = {
      'User-Agent': 'Truecaller/15.8.6 (Android;15)',
      'Connection': 'Keep-Alive',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'Authorization': 'Bearer a2i0G--tSTAV5-okDXVrJeZaIlfypP8TqZRY8Dd-MI5UturBJd0ojtWn17fzQGQe',
    };

    const fetchBulkData = async (type) => {
      const numbersQuery = numbers.join(',');
      const url = `https://search5-noneu.truecaller.com/v2/bulk?q=${numbersQuery}&countryCode=${country}&type=${type}&encoding=json`;
      try {
        const response = await axios.get(url, { headers });
        return { type, data: response.data, status: response.status };
      } catch (error) {
        console.error("Error fetching bulk data:", error);
        return { type, data: null, status: error.response?.status || 500 };
      }
    };

    const isOnlySearchTypesResponse = (json) => {
      return json?.timeoutSeconds && json?.searchTypes && !json?.data;
    };

    const formatEntry = (entry) => {
      const value = entry.value || {};
      const phone = value.phones?.[0] || {};
      const address = value.addresses?.[0] || {};
      const email = value.internetAddresses?.[0] || {};
      const phoneNumber = phone.e164Format;

      if (!value.name) {
        return { message: "No Available Data for This Phone number" };
      }

      return {
        NAME: value.name,
        "Phone Number": phoneNumber || 'Not Found',
        Operator: phone.carrier || 'Not Found',
        Country: address.countryCode || 'Not Found',
        Email: email.id || 'Not Found',
        Score: value.score || 'Not Found',
        "Profile Type": value.access || 'Not Found',
        "Time Zone": address.timeZone || 'Not Found',
        Badges: value.badges?.length ? value.badges.join(', ') : 'Not Found',
        "WhatsApp Link": phoneNumber ? `https://wa.me/${phoneNumber}` : 'Not Available',
        "Telegram Link": phoneNumber ? `https://t.me/${phoneNumber}` : 'Not Available'
      };
    };

    const results = [];

    // Try type 14 first
    const firstTry = await fetchBulkData(14);
    if (firstTry.status === 200 && firstTry.data && !isOnlySearchTypesResponse(firstTry.data)) {
      const entries = firstTry.data.data || [];
      results.push(...entries.map(formatEntry));
      return res.status(200).json(results);
    }

    // Try other types from 1 to 99 except 14
    for (let type = 1; type <= 99; type++) {
      if (type === 14) continue;
      const attempt = await fetchBulkData(type);
      if (attempt.status === 200 && attempt.data?.data) {
        const entries = attempt.data.data;
        results.push(...entries.map(formatEntry));
        return res.status(200).json(results);
      }
    }

    return res.status(200).json({ message: "No Available Data for Given Number(s)" });

  } catch (error) {
    console.error("Error in handler function:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
