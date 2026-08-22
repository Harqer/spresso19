package components.features.catalog

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import components.features.creators.ReviewVideoModel
import components.features.creators.VideoReviewItem
import components.models.*

@Composable
fun ProductReviewsSection(
    reviews: List<ReviewVideoModel>,
    modifier: Modifier = Modifier,
    onVideoWatched: (String, Long) -> Unit = { _, _ -> },
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "Customer Video Reviews",
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
        )

        LazyColumn(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .heightIn(max = 450.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(reviews, key = { it.id }) { review ->
                VideoReviewItem(
                    review = review,
                    onVideoWatched = { duration -> onVideoWatched(review.id, duration) },
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
            }
        }
    }
}
